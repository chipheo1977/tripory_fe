// @vitest-environment node
import type { Place, PlaceSearchService } from "@tripory/itinerary";
import { describe, expect, it, vi, type Mock } from "vitest";
import { destinationCatalog } from "@/composition/destination-catalog";
import { bearerPair, TEST_USER_ID } from "@/test/be-auth-fixtures";
import { makeRequest, TEST_ORIGIN } from "@/test/next-request";
import type { ServerDeps } from "./env";
import {
  handlePlacesReverse,
  handlePlacesSearch,
  handlePlacesSuggestions,
  type PlacesDeps,
} from "./places-handlers";
import { createWindowLimiter, type WindowLimiter } from "@/lib/in-memory/rate-limit";
import { createTtlCache } from "@/lib/in-memory/ttl-cache";

type FetchArgs = [input: RequestInfo | URL, init?: RequestInit];

const NOW_SEC = 1_790_000_000;
const NOW_MS = NOW_SEC * 1000;

const AT = "__Host-tripory_at";
const RT = "__Host-tripory_rt";

const PLACE: Place = {
  id: "N5661583321",
  name: "Crazy House",
  address: "3 Huỳnh Thúc Kháng, Xuân Hương, Da Lat City, Lam Dong",
  coordinate: { latitude: 11.9351, longitude: 108.4306 },
  category: "attraction",
  countryCode: "VN",
};

type FakeService = Readonly<{
  search: Mock<PlaceSearchService["search"]>;
  suggest: Mock<PlaceSearchService["suggest"]>;
  reverse: Mock<PlaceSearchService["reverse"]>;
}>;

const fakeService = (overrides: Partial<FakeService> = {}): FakeService => ({
  search: vi.fn<PlaceSearchService["search"]>(async () => [PLACE]),
  suggest: vi.fn<PlaceSearchService["suggest"]>(async () => [PLACE]),
  reverse: vi.fn<PlaceSearchService["reverse"]>(async () => PLACE),
  ...overrides,
});

const depsWith = (
  service: FakeService,
  options: { limiter?: WindowLimiter; nowMs?: () => number } = {},
): PlacesDeps => {
  // Fetch thật không bao giờ được gọi từ handler: mọi I/O đi qua service giả.
  const fetch = vi.fn<(...args: FetchArgs) => Promise<Response>>(async () => {
    throw new Error("không được gọi mạng");
  });
  const nowMs = options.nowMs ?? (() => NOW_MS);
  const server: ServerDeps = { env: { apiOrigin: "http://be.test" }, fetch, nowMs, secure: true };

  return {
    server,
    service,
    cache: createTtlCache<unknown>({ maxEntries: 50, nowMs }),
    limiter: options.limiter ?? createWindowLimiter({ limit: 30, windowMs: 60_000 }),
    destinations: destinationCatalog,
  };
};

const sessionCookies = (expiresInSec = 3600) => {
  const pair = bearerPair(NOW_SEC, expiresInSec);

  return { pair, cookies: { [AT]: pair.accessToken, [RT]: pair.refreshToken } };
};

const placesRequest = (
  path: string,
  options: { method?: string; cookies?: Record<string, string>; headers?: Record<string, string> } = {},
) => makeRequest(path, { cookies: sessionCookies().cookies, ...options });

const errorCodeOf = async (res: Response) => ((await res.json()) as { errorCode: string }).errorCode;

const serviceCalls = (service: FakeService) =>
  service.search.mock.calls.length + service.suggest.mock.calls.length + service.reverse.mock.calls.length;

const HANDLERS = [
  ["search", handlePlacesSearch, "/api/places/search?q=crazy%20house&destination=vn-lam-dong"],
  ["suggestions", handlePlacesSuggestions, "/api/places/suggestions?destination=vn-lam-dong"],
  ["reverse", handlePlacesReverse, "/api/places/reverse?lat=11.9351&lng=108.4306"],
] as const;

describe.each(HANDLERS)("%s: chặn trước khi gọi service", (_name, handle, path) => {
  it("POST → 405 Bff.MethodNotAllowed", async () => {
    const service = fakeService();

    const res = await handle(placesRequest(path, { method: "POST", headers: { origin: TEST_ORIGIN } }), depsWith(service));

    expect(res.status).toBe(405);
    expect(await errorCodeOf(res)).toBe("Bff.MethodNotAllowed");
    expect(serviceCalls(service)).toBe(0);
  });

  it("Origin lạ → 403 Bff.CrossOrigin", async () => {
    const service = fakeService();

    const res = await handle(placesRequest(path, { headers: { origin: "https://evil.test" } }), depsWith(service));

    expect(res.status).toBe(403);
    expect(await errorCodeOf(res)).toBe("Bff.CrossOrigin");
    expect(serviceCalls(service)).toBe(0);
  });

  it("không cookie → 401 Auth.Unauthorized", async () => {
    const service = fakeService();

    const res = await handle(placesRequest(path, { cookies: {} }), depsWith(service));

    expect(res.status).toBe(401);
    expect(await errorCodeOf(res)).toBe("Auth.Unauthorized");
    expect(serviceCalls(service)).toBe(0);
  });

  it.each([
    ["stale (còn 20 giây)", 20],
    ["đã hết hạn", -30],
  ])("cookie %s → 401 session.expired, không xóa cookie", async (_label, expiresInSec) => {
    const service = fakeService();

    const res = await handle(placesRequest(path, { cookies: sessionCookies(expiresInSec).cookies }), depsWith(service));

    expect(res.status).toBe(401);
    expect(await errorCodeOf(res)).toBe("session.expired");
    expect(res.headers.getSetCookie()).toEqual([]);
    expect(serviceCalls(service)).toBe(0);
  });

  it("access hỏng (thiếu refresh) → 401 session.expired", async () => {
    const service = fakeService();
    const { pair } = sessionCookies();

    const res = await handle(placesRequest(path, { cookies: { [AT]: pair.accessToken } }), depsWith(service));

    expect(res.status).toBe(401);
    expect(await errorCodeOf(res)).toBe("session.expired");
    expect(serviceCalls(service)).toBe(0);
  });

  it("vượt giới hạn → 429 Places.RateLimited kèm retry-after, không gọi service", async () => {
    const service = fakeService();
    const deps = depsWith(service, { limiter: createWindowLimiter({ limit: 1, windowMs: 60_000 }) });

    expect((await handle(placesRequest(path), deps)).status).toBe(200);

    const res = await handle(placesRequest(path), deps);

    expect(res.status).toBe(429);
    expect(await errorCodeOf(res)).toBe("Places.RateLimited");
    expect(res.headers.get("retry-after")).toBe("60");
    expect(res.headers.get("cache-control")).toContain("no-store");
    expect(serviceCalls(service)).toBe(1);
  });

  it("GET cùng origin không có header Origin vẫn qua; 200 envelope no-store + nosniff", async () => {
    const service = fakeService();

    const res = await handle(placesRequest(path), depsWith(service));
    const json = (await res.json()) as { status: string; errorCode: unknown };

    expect(res.status).toBe(200);
    expect(json).toMatchObject({ status: "success", errorCode: null });
    expect(res.headers.get("cache-control")).toContain("no-store");
    expect(res.headers.get("x-content-type-options")).toBe("nosniff");
  });

  it("trúng cache thì không gọi service lần hai", async () => {
    const service = fakeService();
    const deps = depsWith(service);

    await handle(placesRequest(path), deps);
    const second = await handle(placesRequest(path), deps);

    expect(second.status).toBe(200);
    expect(serviceCalls(service)).toBe(1);
  });

  it("service lỗi → 502 Places.Unavailable và không cache lỗi", async () => {
    const fail = async (): Promise<never> => {
      throw new Error("place-provider-failed");
    };
    const service = fakeService({
      search: vi.fn<PlaceSearchService["search"]>(fail),
      suggest: vi.fn<PlaceSearchService["suggest"]>(fail),
      reverse: vi.fn<PlaceSearchService["reverse"]>(fail),
    });
    const deps = depsWith(service);

    const first = await handle(placesRequest(path), deps);
    await handle(placesRequest(path), deps);

    expect(first.status).toBe(502);
    expect(await errorCodeOf(first)).toBe("Places.Unavailable");
    expect(first.headers.get("cache-control")).toContain("no-store");
    expect(serviceCalls(service)).toBe(2);
  });
});

describe("giới hạn theo người dùng", () => {
  it("đếm theo userId của phiên, chung cho ba route", async () => {
    const keys: string[] = [];
    const limiter: WindowLimiter = {
      hit: (key) => {
        keys.push(key);
        return { ok: true };
      },
    };
    const deps = depsWith(fakeService(), { limiter });

    for (const [, handle, path] of HANDLERS) await handle(placesRequest(path), deps);

    expect(keys).toEqual([TEST_USER_ID, TEST_USER_ID, TEST_USER_ID]);
  });
});

describe("handlePlacesSearch", () => {
  it("chuẩn hóa từ khóa, bias là tâm điểm đến, trả { places }", async () => {
    const service = fakeService();

    const res = await handlePlacesSearch(
      placesRequest("/api/places/search?q=%20%20Crazy%20%20%20House%20&destination=vn-lam-dong"),
      depsWith(service),
    );

    expect(service.search).toHaveBeenCalledWith({ text: "Crazy House", bias: [108.134, 11.661] }, expect.anything());
    expect(((await res.json()) as { data: unknown }).data).toEqual({ places: [PLACE] });
  });

  it("không có destination → bias null", async () => {
    const service = fakeService();

    await handlePlacesSearch(placesRequest("/api/places/search?q=cho%20ben%20thanh"), depsWith(service));

    expect(service.search.mock.calls[0]?.[0]).toEqual({ text: "cho ben thanh", bias: null });
  });

  it("khóa cache không phân biệt hoa thường", async () => {
    const service = fakeService();
    const deps = depsWith(service);

    await handlePlacesSearch(placesRequest("/api/places/search?q=Crazy"), deps);
    await handlePlacesSearch(placesRequest("/api/places/search?q=crazy"), deps);

    expect(service.search).toHaveBeenCalledTimes(1);
  });

  it("cache hết hạn sau 10 phút", async () => {
    const service = fakeService();
    let now = NOW_MS;
    const deps = depsWith(service, { nowMs: () => now });

    await handlePlacesSearch(placesRequest("/api/places/search?q=crazy"), deps);
    now += 10 * 60_000;
    await handlePlacesSearch(placesRequest("/api/places/search?q=crazy"), deps);

    expect(service.search).toHaveBeenCalledTimes(2);
  });

  it.each([
    ["thiếu q", "/api/places/search"],
    ["q 1 ký tự", "/api/places/search?q=a"],
    ["q chỉ khoảng trắng", "/api/places/search?q=%20%20%20"],
    ["q dài hơn 200 ký tự", `/api/places/search?q=${"a".repeat(201)}`],
    ["destination lạ", "/api/places/search?q=crazy&destination=vn-khong-co"],
  ])("%s → 400 Bff.InvalidQuery, không gọi service", async (_label, path) => {
    const service = fakeService();

    const res = await handlePlacesSearch(placesRequest(path), depsWith(service));

    expect(res.status).toBe(400);
    expect(await errorCodeOf(res)).toBe("Bff.InvalidQuery");
    expect(service.search).not.toHaveBeenCalled();
  });
});

describe("handlePlacesSuggestions", () => {
  it("gọi service với khung của điểm đến, trả { places }", async () => {
    const service = fakeService();

    const res = await handlePlacesSuggestions(
      placesRequest("/api/places/suggestions?destination=vn-lam-dong"),
      depsWith(service),
    );

    expect(service.suggest.mock.calls[0]?.[0]).toEqual([
      [107.2, 9.37],
      [109.41, 12.82],
    ]);
    expect(((await res.json()) as { data: unknown }).data).toEqual({ places: [PLACE] });
  });

  it.each([
    ["thiếu destination", "/api/places/suggestions"],
    ["destination rỗng", "/api/places/suggestions?destination="],
    ["destination lạ", "/api/places/suggestions?destination=cn-hai-nan"],
  ])("%s → 400 Bff.InvalidQuery", async (_label, path) => {
    const service = fakeService();

    const res = await handlePlacesSuggestions(placesRequest(path), depsWith(service));

    expect(res.status).toBe(400);
    expect(await errorCodeOf(res)).toBe("Bff.InvalidQuery");
    expect(service.suggest).not.toHaveBeenCalled();
  });
});

describe("handlePlacesReverse", () => {
  it("làm tròn 5 chữ số trước khi gọi và dùng chung cache cho tọa độ gần trùng", async () => {
    const service = fakeService();
    const deps = depsWith(service);

    await handlePlacesReverse(placesRequest("/api/places/reverse?lat=11.9404123&lng=108.4583449"), deps);
    await handlePlacesReverse(placesRequest("/api/places/reverse?lat=11.940408&lng=108.458341"), deps);

    expect(service.reverse).toHaveBeenCalledTimes(1);
    expect(service.reverse.mock.calls[0]?.[0]).toEqual({ latitude: 11.94041, longitude: 108.45834 });
  });

  it("không có địa điểm → { place: null }", async () => {
    const service = fakeService({ reverse: vi.fn(async () => null) });

    const res = await handlePlacesReverse(placesRequest("/api/places/reverse?lat=16.83&lng=112.34"), depsWith(service));

    expect(((await res.json()) as { data: unknown }).data).toEqual({ place: null });
  });

  it.each([
    ["không có địa điểm", null],
    ["địa điểm không có địa chỉ", { ...PLACE, address: null }],
  ])("%s → chỉ cache 1 phút để lần sau thử lại fallback", async (_label, place) => {
    const service = fakeService({ reverse: vi.fn(async () => place) });
    let now = NOW_MS;
    const deps = depsWith(service, { nowMs: () => now });
    const path = "/api/places/reverse?lat=11.9404&lng=108.4583";

    await handlePlacesReverse(placesRequest(path), deps);
    now += 59_000;
    await handlePlacesReverse(placesRequest(path), deps);
    expect(service.reverse).toHaveBeenCalledTimes(1);

    now += 1_000;
    await handlePlacesReverse(placesRequest(path), deps);
    expect(service.reverse).toHaveBeenCalledTimes(2);
  });

  it("có địa chỉ → cache 24 giờ", async () => {
    const service = fakeService();
    let now = NOW_MS;
    const deps = depsWith(service, { nowMs: () => now });
    const path = "/api/places/reverse?lat=11.9404&lng=108.4583";

    await handlePlacesReverse(placesRequest(path), deps);
    // Quá 1 phút (TTL của kết quả không địa chỉ) nhưng còn trong hạn phiên của cookie test.
    now += 30 * 60_000;
    await handlePlacesReverse(placesRequest(path), deps);

    expect(service.reverse).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["thiếu lat", "/api/places/reverse?lng=108.45"],
    ["lat rỗng", "/api/places/reverse?lat=&lng=108.45"],
    ["NaN", "/api/places/reverse?lat=abc&lng=108.45"],
    ["Infinity", "/api/places/reverse?lat=Infinity&lng=108.45"],
    ["lat ngoài khoảng", "/api/places/reverse?lat=91&lng=108.45"],
    ["lng ngoài khoảng", "/api/places/reverse?lat=11.9&lng=181"],
  ])("%s → 400 Bff.InvalidQuery", async (_label, path) => {
    const service = fakeService();

    const res = await handlePlacesReverse(placesRequest(path), depsWith(service));

    expect(res.status).toBe(400);
    expect(await errorCodeOf(res)).toBe("Bff.InvalidQuery");
    expect(service.reverse).not.toHaveBeenCalled();
  });
});
