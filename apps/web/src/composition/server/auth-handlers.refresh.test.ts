// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  bearerPair,
  beErrorEnvelope,
  beTokenResponse,
  fakeJwt,
  jsonResponse,
  tokenCompromisedEnvelope,
  tokenExpiredEnvelope,
  tokenInvalidRefreshTokenEnvelope,
} from "@/test/be-auth-fixtures";
import { makeRequest, setCookiesOf, TEST_ORIGIN } from "@/test/next-request";
import { handleRefresh } from "./auth-handlers";
import type { ServerDeps } from "./env";
import { UPSTREAM_TIMEOUT_MS } from "./upstream";

type FetchArgs = [input: RequestInfo | URL, init?: RequestInit];

const NOW_SEC = 1_790_000_000;
const NOW_MS = NOW_SEC * 1000;
const SEVEN_DAYS_SEC = 7 * 24 * 60 * 60;
const FORBIDDEN_KEYS = /accessToken|refreshToken|expiresAt/;

const AT = "__Host-tripory_at";
const RT = "__Host-tripory_rt";
const AT_EXP = "__Host-tripory_at_exp";

const fetchReturning = (response: Response) =>
  vi.fn<(...args: FetchArgs) => Promise<Response>>(async () => response);

/** Fetch không bao giờ trả lời, chỉ reject khi signal abort (giống fetch thật). */
const hangingFetch = () =>
  vi.fn(
    (_input: RequestInfo | URL, init?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        const signal = init?.signal;
        const fail = () => reject(new DOMException("aborted", "AbortError"));

        if (signal?.aborted) fail();
        else signal?.addEventListener("abort", fail, { once: true });
      }),
  );

const depsWith = (fetch: (...args: FetchArgs) => Promise<Response>): ServerDeps => ({
  env: { apiOrigin: "http://be.test" },
  fetch,
  nowMs: () => NOW_MS,
  secure: true,
});

/** Cookie phiên của trình duyệt: access hết hạn sau `expiresInSec` giây kể từ NOW. */
const sessionCookies = (expiresInSec: number, suffix = "1") => {
  const pair = bearerPair(NOW_SEC, expiresInSec, suffix);

  return { pair, cookies: { [AT]: pair.accessToken, [RT]: pair.refreshToken } };
};

const refreshRequest = (
  cookies: Record<string, string>,
  extra: { body?: unknown; headers?: Record<string, string>; origin?: string } = {},
) =>
  makeRequest("/api/auth/refresh", {
    method: "POST",
    origin: TEST_ORIGIN,
    cookies,
    ...extra,
  });

/** Các dòng Set-Cookie của response phải là lệnh xóa đủ thuộc tính cho cả 3 cookie phiên. */
const expectSessionCleared = (res: Response) => {
  const lines = res.headers.getSetCookie();

  expect(lines).toHaveLength(3);

  for (const name of [AT, RT, AT_EXP]) {
    const line = lines.find((entry) => entry.startsWith(`${name}=`));

    expect(line, name).toBeDefined();
    expect(line).toMatch(/Max-Age=0/i);
    expect(line).toMatch(/Path=\//i);
    expect(line).toMatch(/Secure/i);
  }
};

const expectSessionExpired = async (res: Response) => {
  expect(res.status).toBe(401);
  expect(await res.json()).toMatchObject({ status: "error", errorCode: "session.expired", data: null });
  expectSessionCleared(res);
};

afterEach(() => {
  vi.useRealTimers();
});

describe("handleRefresh: thiếu hoặc hỏng cookie → hết phiên", () => {
  const fresh = sessionCookies(3600);

  it.each([
    ["không có cookie nào", {}],
    ["thiếu cookie refresh", { [AT]: fresh.pair.accessToken }],
    ["thiếu cookie access", { [RT]: fresh.pair.refreshToken }],
    ["cookie access rỗng", { [AT]: "", [RT]: fresh.pair.refreshToken }],
    ["cookie refresh rỗng", { [AT]: fresh.pair.accessToken, [RT]: "" }],
  ])("%s → 401 session.expired, xóa cookie, fetch 0 lần", async (_label, cookies) => {
    const fetch = fetchReturning(jsonResponse(beTokenResponse(fresh.pair)));

    const res = await handleRefresh(refreshRequest(cookies), depsWith(fetch));

    await expectSessionExpired(res);
    expect(fetch).toHaveBeenCalledTimes(0);
  });

  it.each([
    ["access không phải JWT", "abc"],
    ["access thiếu claim id/email", fakeJwt({ exp: NOW_SEC + 3600 })],
    ["access thiếu exp", fakeJwt({ handle: "a" })],
  ])("%s → 401 session.expired, xóa cookie, fetch 0 lần", async (_label, accessToken) => {
    const fetch = fetchReturning(jsonResponse(beTokenResponse(fresh.pair)));

    const res = await handleRefresh(
      refreshRequest({ [AT]: accessToken, [RT]: "fake-refresh-token-1" }),
      depsWith(fetch),
    );

    await expectSessionExpired(res);
    expect(fetch).toHaveBeenCalledTimes(0);
  });
});

describe("handleRefresh: idempotent khi token còn tươi", () => {
  it("còn 3600 giây → 200 refreshed:false, fetch 0 lần, KHÔNG Set-Cookie", async () => {
    const { cookies } = sessionCookies(3600);
    const fetch = fetchReturning(jsonResponse({}));

    const res = await handleRefresh(refreshRequest(cookies), depsWith(fetch));

    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(await res.json()).toMatchObject({
      status: "success",
      data: { refreshed: false },
      errorCode: null,
    });
    expect(fetch).toHaveBeenCalledTimes(0);
    expect(res.headers.getSetCookie()).toEqual([]);
  });

  it("còn 151 giây vẫn no-op (ngưỡng là > 150)", async () => {
    const { cookies } = sessionCookies(151);
    const fetch = fetchReturning(jsonResponse({}));

    const res = await handleRefresh(refreshRequest(cookies), depsWith(fetch));

    expect(await res.json()).toMatchObject({ data: { refreshed: false } });
    expect(fetch).toHaveBeenCalledTimes(0);
  });

  it("tab A refresh rồi tab B gọi lại với cookie mới → BE chỉ bị gọi 1 lần", async () => {
    const stale = sessionCookies(100);
    const rotated = bearerPair(NOW_SEC, 3600, "2");
    const fetch = fetchReturning(jsonResponse(beTokenResponse(rotated)));
    const deps = depsWith(fetch);

    const tabA = await handleRefresh(refreshRequest(stale.cookies), deps);
    const jar = setCookiesOf(tabA);

    expect((await tabA.json()) as unknown).toMatchObject({ data: { refreshed: true } });

    // Tab B dùng cookie jar chung, nay đã mang token mới.
    const tabB = await handleRefresh(
      refreshRequest({ [AT]: jar[AT]!.value, [RT]: jar[RT]!.value }),
      deps,
    );

    expect((await tabB.json()) as unknown).toMatchObject({ data: { refreshed: false } });
    expect(tabB.headers.getSetCookie()).toEqual([]);
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});

describe("handleRefresh: gọi BE khi token sắp hết hạn", () => {
  it.each([
    ["còn đúng 150 giây", 150],
    ["còn 100 giây", 100],
    ["còn 1 giây", 1],
    ["vừa hết hạn", 0],
    ["đã hết hạn 10 phút", -600],
  ])("%s → POST refresh-token với token từ cookie, 200 + 3 cookie mới", async (_label, expiresInSec) => {
    const stale = sessionCookies(expiresInSec);
    const rotated = bearerPair(NOW_SEC, 3600, "2");
    const fetch = fetchReturning(jsonResponse(beTokenResponse(rotated)));

    const res = await handleRefresh(
      // Body client gửi lên bị bỏ qua: token chỉ lấy từ cookie.
      refreshRequest(stale.cookies, { body: { accessToken: "evil", refreshToken: "evil" } }),
      depsWith(fetch),
    );
    const text = await res.text();

    expect(fetch).toHaveBeenCalledTimes(1);

    const [input, init] = fetch.mock.calls[0] ?? [];

    expect(String(input)).toBe("http://be.test/api/v1/auth/refresh-token");
    expect(init?.method).toBe("POST");
    expect(JSON.parse(String(init?.body))).toEqual({
      accessToken: stale.pair.accessToken,
      refreshToken: stale.pair.refreshToken,
    });
    expect(init?.headers).toEqual({ accept: "application/json", "content-type": "application/json" });

    expect(res.status).toBe(200);
    expect(JSON.parse(text)).toMatchObject({ status: "success", data: { refreshed: true } });

    // Token không bao giờ về JS.
    expect(text).not.toMatch(FORBIDDEN_KEYS);
    expect(text).not.toContain(rotated.accessToken);
    expect(text).not.toContain(rotated.refreshToken);

    const cookies = setCookiesOf(res);

    expect(Object.keys(cookies).sort()).toEqual([AT, AT_EXP, RT].sort());
    expect(cookies[AT]!.value).toBe(rotated.accessToken);
    expect(cookies[RT]!.value).toBe(rotated.refreshToken);
    expect(cookies[AT_EXP]!.value).toBe(String(NOW_SEC + 3600));

    for (const name of [AT, RT]) {
      expect(cookies[name]!.attrs).toMatchObject({
        httponly: true,
        secure: true,
        samesite: "lax",
        path: "/",
        "max-age": String(SEVEN_DAYS_SEC),
      });
    }

    expect(cookies[AT_EXP]!.attrs).not.toHaveProperty("httponly");
  });
});

describe("handleRefresh: BE xác nhận hết phiên → xóa cookie", () => {
  it.each([
    ["400 Token.Compromised", 400, tokenCompromisedEnvelope],
    ["400 Token.Expired", 400, tokenExpiredEnvelope],
    ["400 Token.InvalidRefreshToken", 400, tokenInvalidRefreshTokenEnvelope],
    ["400 NotEmptyValidator (FluentValidation)", 400, beErrorEnvelope("NotEmptyValidator", "Không được để trống.")],
    ["400 mã lạ", 400, beErrorEnvelope("Gi.DoMoi", "Lạ")],
    ["401 envelope", 401, beErrorEnvelope("Auth.Unauthorized", "Chưa xác thực.")],
    ["403 envelope", 403, beErrorEnvelope("Auth.Forbidden", "Không có quyền.")],
  ])("%s → 401 session.expired + Set-Cookie Max-Age=0", async (_label, status, envelope) => {
    const { cookies } = sessionCookies(10);
    const res = await handleRefresh(
      refreshRequest(cookies),
      depsWith(fetchReturning(jsonResponse(envelope, status))),
    );
    const text = JSON.stringify(await res.clone().json());

    await expectSessionExpired(res);
    // Lỗi của BE (kể cả "Token.Compromised") không lộ ra: client chỉ cần biết phiên đã hết.
    expect(text).not.toContain("Token.");
  });

  it.each([
    ["401 body rỗng", new Response("", { status: 401 })],
    ["403 body rỗng", new Response("", { status: 403 })],
    ["400 ProblemDetails", new Response('{"title":"Bad"}', { status: 400, headers: { "content-type": "application/problem+json" } })],
  ])("%s → 401 session.expired + xóa cookie", async (_label, upstream) => {
    const { cookies } = sessionCookies(10);
    const res = await handleRefresh(refreshRequest(cookies), depsWith(fetchReturning(upstream)));

    await expectSessionExpired(res);
  });
});

describe("handleRefresh: lỗi tạm thời → GIỮ cookie, 503", () => {
  const expectKeptSession = async (res: Response, errorCode: string, status: number) => {
    expect(res.status).toBe(status);
    expect(await res.json()).toMatchObject({ status: "error", errorCode });
    // Không Set-Cookie nào: cookie hiện có còn nguyên để lần sau thử lại (D-20, T-03-30).
    expect(res.headers.getSetCookie()).toEqual([]);
    expect(setCookiesOf(res)).toEqual({});
  };

  it.each([
    ["BE 500", 500],
    ["BE 502", 502],
    ["BE 503", 503],
    ["BE 504", 504],
    ["BE 404", 404],
    ["BE 429", 429],
  ])("%s → 503 Bff.RefreshUnavailable, không Set-Cookie", async (_label, status) => {
    const { cookies } = sessionCookies(10);
    const res = await handleRefresh(
      refreshRequest(cookies),
      depsWith(fetchReturning(jsonResponse({ title: "boom" }, status))),
    );

    await expectKeptSession(res, "Bff.RefreshUnavailable", 503);
  });

  it("BE 302 (redirect manual) → 503, giữ cookie", async () => {
    const { cookies } = sessionCookies(10);
    const res = await handleRefresh(
      refreshRequest(cookies),
      depsWith(fetchReturning(new Response(null, { status: 302, headers: { location: "https://evil.test/" } }))),
    );

    await expectKeptSession(res, "Bff.RefreshUnavailable", 503);
  });

  it("lỗi mạng → 503 Bff.RefreshUnavailable, giữ cookie", async () => {
    const { cookies } = sessionCookies(10);
    const fetch = vi.fn<(...args: FetchArgs) => Promise<Response>>(async () => {
      throw new TypeError("fetch failed");
    });

    await expectKeptSession(await handleRefresh(refreshRequest(cookies), depsWith(fetch)), "Bff.RefreshUnavailable", 503);
  });

  it("timeout upstream → 503 Bff.RefreshUnavailable, giữ cookie", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });

    const { cookies } = sessionCookies(10);
    const fetch = hangingFetch();
    const pending = handleRefresh(refreshRequest(cookies), depsWith(fetch));

    await vi.waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
    await vi.advanceTimersByTimeAsync(UPSTREAM_TIMEOUT_MS);

    await expectKeptSession(await pending, "Bff.RefreshUnavailable", 503);
  });
});

describe("handleRefresh: BE 200 nhưng FE không dựng được phiên mới → hết phiên (WR-02)", () => {
  const rotated = bearerPair(NOW_SEC, 3600, "2");
  const valid = beTokenResponse(rotated);
  const data = valid.data as Record<string, unknown>;

  it.each([
    ["body không phải JSON", new Response("<html>gateway</html>", { status: 200 })],
    ["body rỗng", new Response("", { status: 200 })],
    ["envelope thiếu data", jsonResponse({ status: "success" })],
    ["envelope status error", jsonResponse({ ...valid, status: "error" })],
    ["thiếu refreshToken", jsonResponse({ ...valid, data: { ...data, refreshToken: undefined } })],
    ["access token không có claim hợp lệ", jsonResponse({ ...valid, data: { ...data, accessToken: fakeJwt({ exp: NOW_SEC + 3600 }) } })],
    ["expiresAt không parse được", jsonResponse({ ...valid, data: { ...data, expiresAt: "hôm qua" } })],
  ])(
    // BE đã xoay refresh token cũ: giữ cookie cũ sẽ gửi lại token đã dùng → Token.Compromised.
    "%s → 401 session.expired + xóa cả 3 cookie (không giữ token đã bị xoay)",
    async (_label, upstream) => {
      const { cookies } = sessionCookies(10);
      const res = await handleRefresh(refreshRequest(cookies), depsWith(fetchReturning(upstream)));

      await expectSessionExpired(res);
    },
  );
});

describe("handleRefresh: Origin", () => {
  it.each([
    ["Origin lạ", { headers: { origin: "https://evil.test" } }],
    ["Origin: null", { headers: { origin: "null" } }],
  ])("%s → 403 Bff.CrossOrigin, fetch 0 lần, không đụng cookie", async (_label, extra) => {
    const { cookies } = sessionCookies(10);
    const fetch = fetchReturning(jsonResponse(beTokenResponse(bearerPair(NOW_SEC, 3600, "2"))));
    const request = makeRequest("/api/auth/refresh", { method: "POST", cookies, ...extra });

    const res = await handleRefresh(request, depsWith(fetch));

    expect(res.status).toBe(403);
    expect(await res.json()).toMatchObject({ status: "error", errorCode: "Bff.CrossOrigin" });
    expect(fetch).toHaveBeenCalledTimes(0);
    expect(res.headers.getSetCookie()).toEqual([]);
  });

  it("thiếu Origin và Sec-Fetch-Site → 403, fetch 0 lần", async () => {
    const { cookies } = sessionCookies(10);
    const fetch = fetchReturning(jsonResponse({}));

    const res = await handleRefresh(
      makeRequest("/api/auth/refresh", { method: "POST", cookies }),
      depsWith(fetch),
    );

    expect(res.status).toBe(403);
    expect(fetch).toHaveBeenCalledTimes(0);
  });

  it("Origin lạ được kiểm TRƯỚC cả khi thiếu cookie: không xóa cookie của người dùng", async () => {
    const res = await handleRefresh(
      makeRequest("/api/auth/refresh", { method: "POST", headers: { origin: "https://evil.test" } }),
      depsWith(fetchReturning(jsonResponse({}))),
    );

    expect(res.status).toBe(403);
    expect(res.headers.getSetCookie()).toEqual([]);
  });
});

describe("handleRefresh: APP_ORIGIN (WR-04)", () => {
  const PUBLIC_ORIGIN = "https://www.example.com";
  const originDeps = (fetch: (...args: FetchArgs) => Promise<Response>): ServerDeps => ({
    ...depsWith(fetch),
    env: { apiOrigin: "http://be.test", appOrigin: PUBLIC_ORIGIN },
  });

  it("appOrigin đặt: Origin công khai được qua, Origin nội bộ bị 403", async () => {
    const { cookies } = sessionCookies(3600);
    const fetch = fetchReturning(jsonResponse({}));

    const allowed = await handleRefresh(
      makeRequest("/api/auth/refresh", { method: "POST", cookies, headers: { origin: PUBLIC_ORIGIN } }),
      originDeps(fetch),
    );
    const blocked = await handleRefresh(refreshRequest(cookies), originDeps(fetch));

    expect(allowed.status).toBe(200);
    expect(blocked.status).toBe(403);
    expect(await blocked.json()).toMatchObject({ errorCode: "Bff.CrossOrigin" });
  });
});

describe("handleRefresh: giới hạn tốc độ theo IP (D-35)", () => {
  // Giá trị thử nghiệm, không phải bí mật thật.
  const SECRET = "bi-mat-thu-nghiem";
  const secretDeps = (fetch: (...args: FetchArgs) => Promise<Response>): ServerDeps => ({
    ...depsWith(fetch),
    env: { apiOrigin: "http://be.test", bffSharedSecret: SECRET },
  });

  it("có secret + IP của nền tảng → gửi x-bff-secret và x-forwarded-for tới refresh-token", async () => {
    const { cookies } = sessionCookies(10);
    const fetch = fetchReturning(jsonResponse(beTokenResponse(bearerPair(NOW_SEC, 3600, "2"))));

    await handleRefresh(refreshRequest(cookies, { headers: { "x-real-ip": "203.0.113.7" } }), secretDeps(fetch));

    expect(fetch.mock.calls[0]?.[1]?.headers).toEqual({
      accept: "application/json",
      "content-type": "application/json",
      "x-bff-secret": SECRET,
      "x-forwarded-for": "203.0.113.7",
    });
  });

  it("BE 429 vẫn giữ ngữ nghĩa cũ: 503 Bff.RefreshUnavailable, giữ cookie, không lộ Retry-After/secret", async () => {
    const { cookies } = sessionCookies(10);
    const upstream = new Response(
      JSON.stringify(beErrorEnvelope("RateLimit.TooManyRequests", "Bạn thao tác quá nhanh. Vui lòng thử lại sau.")),
      { status: 429, headers: { "content-type": "application/json", "retry-after": "30" } },
    );

    const res = await handleRefresh(
      refreshRequest(cookies, { headers: { "x-real-ip": "203.0.113.7" } }),
      secretDeps(fetchReturning(upstream)),
    );
    const text = await res.text();

    expect(res.status).toBe(503);
    expect(JSON.parse(text)).toMatchObject({ status: "error", errorCode: "Bff.RefreshUnavailable" });
    expect(res.headers.getSetCookie()).toEqual([]);
    expect(res.headers.get("retry-after")).toBeNull();
    expect(text).not.toContain(SECRET);
  });
});
