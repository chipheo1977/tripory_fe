// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { bearerPair } from "@/test/be-auth-fixtures";
import { makeRequest, TEST_ORIGIN } from "@/test/next-request";
import type { ServerDeps } from "./env";
import { handleMapsResolve } from "./maps-handlers";

type FetchArgs = [input: RequestInfo | URL, init?: RequestInit];

const NOW_SEC = 1_790_000_000;
const NOW_MS = NOW_SEC * 1000;

const AT = "__Host-tripory_at";
const RT = "__Host-tripory_rt";

const GOOGLE = "https://www.google.com/maps/place/Ho+Guom";

const redirectTo = (location: string) => new Response(null, { status: 302, headers: { location } });

const fetchReturning = (response: Response) =>
  vi.fn<(...args: FetchArgs) => Promise<Response>>(async () => response);

const depsWith = (fetch: (...args: FetchArgs) => Promise<Response>): ServerDeps => ({
  env: { apiOrigin: "http://be.test" },
  fetch,
  nowMs: () => NOW_MS,
  secure: true,
});

/** Cookie phiên còn `expiresInSec` giây (≤ 0 là đã hết hạn). */
const sessionCookies = (expiresInSec: number) => {
  const pair = bearerPair(NOW_SEC, expiresInSec);

  return { pair, cookies: { [AT]: pair.accessToken, [RT]: pair.refreshToken } };
};

const resolveRequest = (
  options: { method?: string; cookies?: Record<string, string>; headers?: Record<string, string>; body?: unknown } = {},
) => makeRequest("/api/maps/resolve", { method: "POST", origin: TEST_ORIGIN, ...options });

const errorCodeOf = async (res: Response) => ((await res.json()) as { errorCode: string }).errorCode;

describe("handleMapsResolve: chặn trước khi gọi Google", () => {
  it("GET → 405 Bff.MethodNotAllowed", async () => {
    const fetch = fetchReturning(redirectTo(GOOGLE));
    const { cookies } = sessionCookies(3600);

    const res = await handleMapsResolve(
      resolveRequest({ method: "GET", cookies }),
      depsWith(fetch),
    );

    expect(res.status).toBe(405);
    expect(await errorCodeOf(res)).toBe("Bff.MethodNotAllowed");
    expect(res.headers.get("cache-control")).toContain("no-store");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("Origin lạ → 403 Bff.CrossOrigin", async () => {
    const fetch = fetchReturning(redirectTo(GOOGLE));
    const { cookies } = sessionCookies(3600);

    const res = await handleMapsResolve(
      resolveRequest({ cookies, headers: { origin: "https://evil.test" }, body: { url: "https://maps.app.goo.gl/a" } }),
      depsWith(fetch),
    );

    expect(res.status).toBe(403);
    expect(await errorCodeOf(res)).toBe("Bff.CrossOrigin");
    expect(res.headers.get("cache-control")).toContain("no-store");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("không cookie → 401 Auth.Unauthorized", async () => {
    const fetch = fetchReturning(redirectTo(GOOGLE));

    const res = await handleMapsResolve(
      resolveRequest({ body: { url: "https://maps.app.goo.gl/a" } }),
      depsWith(fetch),
    );

    expect(res.status).toBe(401);
    expect(await errorCodeOf(res)).toBe("Auth.Unauthorized");
    expect(res.headers.get("cache-control")).toContain("no-store");
    expect(fetch).not.toHaveBeenCalled();
  });

  it.each([
    ["stale (còn 20 giây)", 20],
    ["đã hết hạn", -30],
  ])("cookie %s → 401 session.expired, không xóa cookie", async (_label, expiresInSec) => {
    const fetch = fetchReturning(redirectTo(GOOGLE));
    const { cookies } = sessionCookies(expiresInSec);

    const res = await handleMapsResolve(
      resolveRequest({ cookies, body: { url: "https://maps.app.goo.gl/a" } }),
      depsWith(fetch),
    );

    expect(res.status).toBe(401);
    expect(await errorCodeOf(res)).toBe("session.expired");
    expect(res.headers.getSetCookie()).toEqual([]);
    expect(res.headers.get("cache-control")).toContain("no-store");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("access hỏng (invalid) → 401 session.expired, không xóa cookie", async () => {
    const fetch = fetchReturning(redirectTo(GOOGLE));
    const { pair } = sessionCookies(3600);

    const res = await handleMapsResolve(
      resolveRequest({ cookies: { [AT]: pair.accessToken }, body: { url: "https://maps.app.goo.gl/a" } }),
      depsWith(fetch),
    );

    expect(res.status).toBe(401);
    expect(await errorCodeOf(res)).toBe("session.expired");
    expect(res.headers.getSetCookie()).toEqual([]);
    expect(fetch).not.toHaveBeenCalled();
  });

  it.each([
    ["{}", {}],
    ["url không phải chuỗi", { url: 1 }],
    ["không phải JSON", "không phải json"],
    ["mảng", ["https://maps.app.goo.gl/a"]],
    ["url dài hơn 2048 ký tự", { url: `https://maps.app.goo.gl/${"a".repeat(2100)}` }],
  ])("body sai (%s) → 400 Bff.InvalidBody", async (_label, body) => {
    const fetch = fetchReturning(redirectTo(GOOGLE));
    const { cookies } = sessionCookies(3600);

    const res = await handleMapsResolve(resolveRequest({ cookies, body }), depsWith(fetch));

    expect(res.status).toBe(400);
    expect(await errorCodeOf(res)).toBe("Bff.InvalidBody");
    expect(res.headers.get("cache-control")).toContain("no-store");
    expect(fetch).not.toHaveBeenCalled();
  });
});

describe("handleMapsResolve: resolve", () => {
  it("link hợp lệ → 200 envelope { url }, no-store, fetch 1 lần", async () => {
    const fetch = fetchReturning(redirectTo(GOOGLE));
    const { cookies } = sessionCookies(3600);

    const res = await handleMapsResolve(
      resolveRequest({ cookies, body: { url: "https://maps.app.goo.gl/abc", extra: "bị bỏ" } }),
      depsWith(fetch),
    );
    const json = (await res.json()) as { status: string; data: unknown; errorCode: unknown };

    expect(res.status).toBe(200);
    expect(json).toMatchObject({ status: "success", data: { url: GOOGLE }, errorCode: null });
    expect(res.headers.get("cache-control")).toContain("no-store");
    expect(res.headers.get("x-content-type-options")).toBe("nosniff");
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("không gửi cookie hay Authorization của người dùng tới Google", async () => {
    const fetch = fetchReturning(redirectTo(GOOGLE));
    const { cookies } = sessionCookies(3600);

    await handleMapsResolve(resolveRequest({ cookies, body: { url: "https://maps.app.goo.gl/abc" } }), depsWith(fetch));

    const headers = new Headers(fetch.mock.calls[0]?.[1]?.headers);

    expect(headers.has("cookie")).toBe(false);
    expect(headers.has("authorization")).toBe(false);
  });

  it("host lạ → 422 Maps.UnresolvableLink, fetch không được gọi", async () => {
    const fetch = fetchReturning(redirectTo(GOOGLE));
    const { cookies } = sessionCookies(3600);

    const res = await handleMapsResolve(
      resolveRequest({ cookies, body: { url: "http://169.254.169.254/latest" } }),
      depsWith(fetch),
    );

    expect(res.status).toBe(422);
    expect(await errorCodeOf(res)).toBe("Maps.UnresolvableLink");
    expect(res.headers.get("cache-control")).toContain("no-store");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("Google trả 404 → 422 Maps.UnresolvableLink", async () => {
    const fetch = fetchReturning(new Response(null, { status: 404 }));
    const { cookies } = sessionCookies(3600);

    const res = await handleMapsResolve(
      resolveRequest({ cookies, body: { url: "https://maps.app.goo.gl/abc" } }),
      depsWith(fetch),
    );

    expect(res.status).toBe(422);
    expect(await errorCodeOf(res)).toBe("Maps.UnresolvableLink");
  });
});
