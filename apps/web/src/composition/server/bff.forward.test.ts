// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { bearerPair, jsonResponse } from "@/test/be-auth-fixtures";
import { makeRequest, TEST_ORIGIN } from "@/test/next-request";
import { BFF_MAX_BODY_BYTES, forwardToBackend } from "./bff";
import type { ServerDeps } from "./env";
import { UPSTREAM_TIMEOUT_MS } from "./upstream";

type FetchArgs = [input: RequestInfo | URL, init?: RequestInit];

const NOW_SEC = 1_790_000_000;
const NOW_MS = NOW_SEC * 1000;

const AT = "__Host-tripory_at";
const RT = "__Host-tripory_rt";

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

/** Cookie phiên còn `expiresInSec` giây (≤ 0 là đã hết hạn). */
const sessionCookies = (expiresInSec: number) => {
  const pair = bearerPair(NOW_SEC, expiresInSec);

  return { pair, cookies: { [AT]: pair.accessToken, [RT]: pair.refreshToken } };
};

const bffRequest = (
  path: string,
  options: { method?: string; cookies?: Record<string, string>; headers?: Record<string, string>; body?: unknown } = {},
) => makeRequest(path, { origin: TEST_ORIGIN, ...options });

const errorCodeOf = async (res: Response) => ((await res.json()) as { errorCode: string }).errorCode;

const ok = { status: "success", data: { id: 1 }, message: null, errorCode: null, timestamp: "2026-10-13T08:00:00+00:00" };

afterEach(() => {
  vi.useRealTimers();
});

describe("forwardToBackend: chặn trước khi gọi BE", () => {
  it.each(["PATCH", "OPTIONS", "HEAD"])("method %s → 405 Bff.MethodNotAllowed, BE 0 lần", async (method) => {
    const fetch = fetchReturning(jsonResponse(ok));

    const res = await forwardToBackend(bffRequest("/api/bff/users/me", { method }), ["users", "me"], depsWith(fetch));

    expect(res.status).toBe(405);
    expect(await errorCodeOf(res)).toBe("Bff.MethodNotAllowed");
    expect(fetch).toHaveBeenCalledTimes(0);
  });

  it("auth/login → 404 Bff.NotFound, BE 0 lần (client không gọi /auth/* của BE qua BFF)", async () => {
    const fetch = fetchReturning(jsonResponse(ok));
    const { cookies } = sessionCookies(3600);

    const res = await forwardToBackend(
      bffRequest("/api/bff/auth/login", { method: "POST", cookies, body: { email: "a@b.vn" } }),
      ["auth", "login"],
      depsWith(fetch),
    );

    expect(res.status).toBe(404);
    expect(await errorCodeOf(res)).toBe("Bff.NotFound");
    expect(fetch).toHaveBeenCalledTimes(0);
  });

  it.each([
    [["users", ".."], "/api/bff/users/.."],
    // `new URL` gộp `/%2e%2e/` thành dấu chấm kép, nên dùng dạng dính liền để giữ nguyên trong chuỗi thô.
    [["users", "../auth"], "/api/bff/users/%2e%2e%2fauth"],
    [["users", "x"], "/api/bff/users/x%2e"],
    [["users", "a/b"], "/api/bff/users/a%2Fb"],
    [["users", "a\\b"], "/api/bff/users/a%5Cb"],
  ] as const)("traversal %j → 400 Bff.BadPath, BE 0 lần", async (segments, path) => {
    const fetch = fetchReturning(jsonResponse(ok));

    const res = await forwardToBackend(bffRequest(path), segments, depsWith(fetch));

    expect(res.status).toBe(400);
    expect(await errorCodeOf(res)).toBe("Bff.BadPath");
    expect(fetch).toHaveBeenCalledTimes(0);
  });

  it.each(["GET", "POST"])("%s với Origin lạ → 403 Bff.CrossOrigin, BE 0 lần", async (method) => {
    const fetch = fetchReturning(jsonResponse(ok));
    const { cookies } = sessionCookies(3600);

    const res = await forwardToBackend(
      makeRequest("/api/bff/users/me", {
        method,
        cookies,
        headers: { origin: "https://evil.test" },
        ...(method === "POST" ? { body: {} } : {}),
      }),
      ["users", "me"],
      depsWith(fetch),
    );

    expect(res.status).toBe(403);
    expect(await errorCodeOf(res)).toBe("Bff.CrossOrigin");
    expect(fetch).toHaveBeenCalledTimes(0);
  });

  it("POST không Origin + sec-fetch-site cross-site → 403, BE 0 lần", async () => {
    const fetch = fetchReturning(jsonResponse(ok));

    const res = await forwardToBackend(
      makeRequest("/api/bff/users/me", { method: "POST", headers: { "sec-fetch-site": "cross-site" }, body: {} }),
      ["users", "me"],
      depsWith(fetch),
    );

    expect(res.status).toBe(403);
    expect(await errorCodeOf(res)).toBe("Bff.CrossOrigin");
    expect(fetch).toHaveBeenCalledTimes(0);
  });

  it.each(["GET", "POST"])(
    "%s: trình duyệt không nhét được x-bff-secret / x-forwarded-for / x-real-ip tới BE qua /api/bff (D-35)",
    async (method) => {
      const fetch = fetchReturning(jsonResponse(ok));
      const { cookies } = sessionCookies(3600);
      // Cả khi BFF đã cấu hình secret, proxy chung cũng không gửi secret (không truyền clientIp).
      const deps: ServerDeps = { ...depsWith(fetch), env: { apiOrigin: "http://be.test", bffSharedSecret: "bi-mat-thu-nghiem" } };

      await forwardToBackend(
        bffRequest("/api/bff/users/me", {
          method,
          cookies,
          headers: {
            "x-bff-secret": "gia-mao",
            "X-Forwarded-For": "6.6.6.6",
            "x-real-ip": "6.6.6.6",
            "x-vercel-forwarded-for": "6.6.6.6",
          },
          ...(method === "POST" ? { body: {} } : {}),
        }),
        ["users", "me"],
        deps,
      );

      expect(fetch).toHaveBeenCalledTimes(1);

      const sent = Object.keys((fetch.mock.calls[0]?.[1]?.headers ?? {}) as Record<string, string>).map((name) =>
        name.toLowerCase(),
      );

      expect(sent).not.toContain("x-bff-secret");
      expect(sent).not.toContain("x-forwarded-for");
      expect(sent).not.toContain("x-real-ip");
      expect(sent).not.toContain("x-vercel-forwarded-for");
      expect(JSON.stringify(fetch.mock.calls[0]?.[1]?.headers)).not.toMatch(/gia-mao|bi-mat-thu-nghiem/);
    },
  );

  it("GET không Origin → qua", async () => {
    const fetch = fetchReturning(jsonResponse(ok));

    const res = await forwardToBackend(makeRequest("/api/bff/users/me"), ["users", "me"], depsWith(fetch));

    expect(res.status).toBe(200);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["stale (còn 20 giây, ngưỡng STALE_AT_SEC = 30)", 20],
    ["đã hết hạn", -30],
  ])("cookie %s → 401 session.expired, BE 0 lần", async (_label, expiresInSec) => {
    const fetch = fetchReturning(jsonResponse(ok));
    const { cookies } = sessionCookies(expiresInSec);

    const res = await forwardToBackend(bffRequest("/api/bff/users/me", { cookies }), ["users", "me"], depsWith(fetch));

    expect(res.status).toBe(401);
    expect(await errorCodeOf(res)).toBe("session.expired");
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(fetch).toHaveBeenCalledTimes(0);
  });

  it("cookie access hỏng hoặc thiếu refresh (invalid) → 401 session.expired, BE 0 lần", async () => {
    const fetch = fetchReturning(jsonResponse(ok));
    const { pair } = sessionCookies(3600);

    const invalidCookies: Record<string, string>[] = [{ [AT]: "khong-phai-jwt", [RT]: "r" }, { [AT]: pair.accessToken }];

    for (const cookies of invalidCookies) {
      const res = await forwardToBackend(
        bffRequest("/api/bff/users/me", { cookies }),
        ["users", "me"],
        depsWith(fetch),
      );

      expect(res.status).toBe(401);
      expect(await errorCodeOf(res)).toBe("session.expired");
    }

    expect(fetch).toHaveBeenCalledTimes(0);
  });

  it("content-length vượt 4 MB → 413 Bff.PayloadTooLarge, BE 0 lần", async () => {
    const fetch = fetchReturning(jsonResponse(ok));

    const res = await forwardToBackend(
      bffRequest("/api/bff/users/me", {
        method: "POST",
        headers: { "content-length": String(BFF_MAX_BODY_BYTES + 1), "content-type": "application/json" },
        body: "{}",
      }),
      ["users", "me"],
      depsWith(fetch),
    );

    expect(res.status).toBe(413);
    expect(await errorCodeOf(res)).toBe("Bff.PayloadTooLarge");
    expect(fetch).toHaveBeenCalledTimes(0);
  });

  it("body thực tế vượt 4 MB (không khai content-length) → 413, BE 0 lần", async () => {
    const fetch = fetchReturning(jsonResponse(ok));

    const res = await forwardToBackend(
      bffRequest("/api/bff/users/me", {
        method: "PUT",
        headers: { "content-type": "text/plain" },
        body: "x".repeat(BFF_MAX_BODY_BYTES + 1),
      }),
      ["users", "me"],
      depsWith(fetch),
    );

    expect(res.status).toBe(413);
    expect(await errorCodeOf(res)).toBe("Bff.PayloadTooLarge");
    expect(fetch).toHaveBeenCalledTimes(0);
  });

  it("hằng trần body là đúng 4 MB", () => {
    expect(BFF_MAX_BODY_BYTES).toBe(4 * 1024 * 1024);
  });
});

describe("forwardToBackend: Bearer theo phiên", () => {
  it("không cookie → chuyển tiếp không Bearer (endpoint public vẫn chạy)", async () => {
    const fetch = fetchReturning(jsonResponse(ok));

    const res = await forwardToBackend(bffRequest("/api/bff/itineraries/abc"), ["itineraries", "abc"], depsWith(fetch));

    expect(res.status).toBe(200);
    expect(fetch).toHaveBeenCalledTimes(1);

    const headers = fetch.mock.calls[0]?.[1]?.headers as Record<string, string>;

    expect(headers).not.toHaveProperty("authorization");
  });

  it("fresh → gắn Authorization: Bearer lấy từ cookie", async () => {
    const fetch = fetchReturning(jsonResponse(ok));
    const { cookies, pair } = sessionCookies(3600);

    await forwardToBackend(bffRequest("/api/bff/users/me", { cookies }), ["users", "me"], depsWith(fetch));

    const headers = fetch.mock.calls[0]?.[1]?.headers as Record<string, string>;

    expect(headers.authorization).toBe(`Bearer ${pair.accessToken}`);
  });

  it("client tự đặt authorization giả → bị bỏ; không cookie thì BE không nhận authorization nào", async () => {
    const fetch = fetchReturning(jsonResponse(ok));

    await forwardToBackend(
      bffRequest("/api/bff/users/me", { headers: { authorization: "Bearer fake" } }),
      ["users", "me"],
      depsWith(fetch),
    );

    const headers = fetch.mock.calls[0]?.[1]?.headers as Record<string, string>;

    expect(JSON.stringify(headers)).not.toContain("fake");
    expect(headers).not.toHaveProperty("authorization");
  });

  it("client đặt authorization giả KÈM cookie fresh → BE chỉ nhận Bearer do server gắn", async () => {
    const fetch = fetchReturning(jsonResponse(ok));
    const { cookies, pair } = sessionCookies(3600);

    await forwardToBackend(
      bffRequest("/api/bff/users/me", { cookies, headers: { authorization: "Bearer fake" } }),
      ["users", "me"],
      depsWith(fetch),
    );

    const headers = fetch.mock.calls[0]?.[1]?.headers as Record<string, string>;

    expect(headers.authorization).toBe(`Bearer ${pair.accessToken}`);
  });
});

describe("forwardToBackend: request đi BE", () => {
  it("header đi BE là tập con của accept, content-type, authorization", async () => {
    const fetch = fetchReturning(jsonResponse(ok));
    const { cookies } = sessionCookies(3600);

    await forwardToBackend(
      bffRequest("/api/bff/users/me", {
        method: "POST",
        cookies,
        headers: {
          accept: "application/json",
          host: "app.test",
          "x-forwarded-for": "1.2.3.4",
          "x-forwarded-host": "evil.test",
          "x-custom": "1",
          "user-agent": "jest",
        },
        body: { a: 1 },
      }),
      ["users", "me"],
      depsWith(fetch),
    );

    const headers = fetch.mock.calls[0]?.[1]?.headers as Record<string, string>;
    const names = Object.keys(headers).map((name) => name.toLowerCase());

    for (const name of names) expect(["accept", "content-type", "authorization"]).toContain(name);
    for (const banned of ["cookie", "host", "origin", "x-forwarded-for", "x-forwarded-host", "x-custom"]) {
      expect(names).not.toContain(banned);
    }
    expect(headers.accept).toBe("application/json");
    expect(headers["content-type"]).toBe("application/json");
  });

  it("URL upstream là API_ORIGIN + /api/v1/<path> và giữ query", async () => {
    const fetch = fetchReturning(jsonResponse(ok));

    await forwardToBackend(bffRequest("/api/bff/users/me?page=2"), ["users", "me"], depsWith(fetch));

    expect(String(fetch.mock.calls[0]?.[0])).toBe("http://be.test/api/v1/users/me?page=2");
  });

  it("segment được encode khi dựng URL upstream", async () => {
    const fetch = fetchReturning(jsonResponse(ok));

    await forwardToBackend(bffRequest("/api/bff/users/a%20b"), ["users", "a b"], depsWith(fetch));

    expect(String(fetch.mock.calls[0]?.[0])).toBe("http://be.test/api/v1/users/a%20b");
  });

  it("query độc hại không đổi được origin upstream", async () => {
    const fetch = fetchReturning(jsonResponse(ok));

    await forwardToBackend(
      bffRequest("/api/bff/users/me?next=http://evil.test//x"),
      ["users", "me"],
      depsWith(fetch),
    );

    expect(new URL(String(fetch.mock.calls[0]?.[0])).origin).toBe("http://be.test");
  });

  it("GET không gửi body, method được giữ nguyên", async () => {
    const fetch = fetchReturning(jsonResponse(ok));

    await forwardToBackend(bffRequest("/api/bff/users/me"), ["users", "me"], depsWith(fetch));

    const init = fetch.mock.calls[0]?.[1];

    expect(init?.method).toBe("GET");
    expect(init?.body ?? undefined).toBeUndefined();
  });

  it.each(["POST", "PUT"])("%s chuyển nguyên bytes body", async (method) => {
    const fetch = fetchReturning(jsonResponse(ok));
    const { cookies } = sessionCookies(3600);
    const payload = { title: "Chuyến đi Đà Lạt", days: 3 };

    await forwardToBackend(
      bffRequest("/api/bff/itineraries", { method, cookies, body: payload }),
      ["itineraries"],
      depsWith(fetch),
    );

    const init = fetch.mock.calls[0]?.[1];

    expect(init?.method).toBe(method);
    expect(Buffer.from(init?.body as ArrayBuffer).toString("utf8")).toBe(JSON.stringify(payload));
  });

  it("DELETE chuyển tiếp với Bearer", async () => {
    const fetch = fetchReturning(jsonResponse(ok));
    const { cookies, pair } = sessionCookies(3600);

    await forwardToBackend(
      bffRequest("/api/bff/itineraries/abc", { method: "DELETE", cookies }),
      ["itineraries", "abc"],
      depsWith(fetch),
    );

    const init = fetch.mock.calls[0]?.[1];

    expect(init?.method).toBe("DELETE");
    expect((init?.headers as Record<string, string>).authorization).toBe(`Bearer ${pair.accessToken}`);
  });

  it("multipart giữ nguyên content-type có boundary và bytes body", async () => {
    const fetch = fetchReturning(jsonResponse(ok));
    const { cookies } = sessionCookies(3600);
    const contentType = "multipart/form-data; boundary=----tripory123";
    const body = '------tripory123\r\nContent-Disposition: form-data; name="f"\r\n\r\nxin chào\r\n------tripory123--\r\n';

    await forwardToBackend(
      bffRequest("/api/bff/users/me", { method: "PUT", cookies, headers: { "content-type": contentType }, body }),
      ["users", "me"],
      depsWith(fetch),
    );

    const init = fetch.mock.calls[0]?.[1];

    expect((init?.headers as Record<string, string>)["content-type"]).toBe(contentType);
    expect(Buffer.from(init?.body as ArrayBuffer).toString("utf8")).toBe(body);
  });

  it("body đúng bằng trần 4 MB vẫn được chuyển tiếp", async () => {
    const fetch = fetchReturning(jsonResponse(ok));

    const res = await forwardToBackend(
      bffRequest("/api/bff/users/me", {
        method: "PUT",
        headers: { "content-type": "text/plain" },
        body: "x".repeat(BFF_MAX_BODY_BYTES),
      }),
      ["users", "me"],
      depsWith(fetch),
    );

    expect(res.status).toBe(200);
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});

describe("forwardToBackend: response về client", () => {
  it.each([200, 201, 400, 404, 500])("BE %i → cùng status, body nguyên, content-type giữ, no-store", async (status) => {
    const body = { status: status < 400 ? "success" : "error", data: { n: status }, errorCode: null };
    const fetch = fetchReturning(jsonResponse(body, status));

    const res = await forwardToBackend(bffRequest("/api/bff/users/me"), ["users", "me"], depsWith(fetch));

    expect(res.status).toBe(status);
    expect(await res.json()).toEqual(body);
    expect(res.headers.get("content-type")).toContain("application/json");
    expect(res.headers.get("cache-control")).toBe("no-store");
  });

  it("BE 204 → 204 không body", async () => {
    const fetch = fetchReturning(new Response(null, { status: 204 }));

    const res = await forwardToBackend(
      bffRequest("/api/bff/itineraries/abc", { method: "DELETE" }),
      ["itineraries", "abc"],
      depsWith(fetch),
    );

    expect(res.status).toBe(204);
    expect(await res.text()).toBe("");
    expect(res.headers.get("cache-control")).toBe("no-store");
  });

  it("set-cookie, x-powered-by, location của BE không lọt về client", async () => {
    const upstream = new Response(JSON.stringify(ok), {
      status: 200,
      headers: {
        "content-type": "application/json",
        "set-cookie": "evil=1; Path=/",
        "x-powered-by": "ASP.NET",
        location: "https://evil.test",
        server: "Kestrel",
      },
    });
    const fetch = fetchReturning(upstream);

    const res = await forwardToBackend(bffRequest("/api/bff/users/me"), ["users", "me"], depsWith(fetch));

    expect(res.headers.getSetCookie()).toEqual([]);
    expect(res.headers.get("set-cookie")).toBeNull();
    expect(res.headers.get("x-powered-by")).toBeNull();
    expect(res.headers.get("location")).toBeNull();
    expect(res.headers.get("server")).toBeNull();
  });

  it.each([301, 302, 304])("BE %i không được theo, không lộ location, thành 502 Bff.InvalidUpstream", async (status) => {
    const fetch = fetchReturning(
      new Response(null, { status, headers: { location: "https://evil.test/steal" } }),
    );

    const res = await forwardToBackend(bffRequest("/api/bff/users/me"), ["users", "me"], depsWith(fetch));

    expect(res.status).toBe(502);
    expect(await errorCodeOf(res)).toBe("Bff.InvalidUpstream");
    expect(res.headers.get("location")).toBeNull();
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch.mock.calls[0]?.[1]?.redirect).toBe("manual");
  });

  it("timeout upstream → 504 Bff.UpstreamTimeout", async () => {
    vi.useFakeTimers();

    const fetch = hangingFetch();
    const pending = forwardToBackend(bffRequest("/api/bff/users/me"), ["users", "me"], depsWith(fetch));

    await vi.advanceTimersByTimeAsync(UPSTREAM_TIMEOUT_MS + 1);

    const res = await pending;

    expect(res.status).toBe(504);
    expect(await errorCodeOf(res)).toBe("Bff.UpstreamTimeout");
  });

  it("lỗi mạng → 502 Bff.UpstreamUnavailable", async () => {
    const fetch = vi.fn<(...args: FetchArgs) => Promise<Response>>(async () => {
      throw new TypeError("fetch failed");
    });

    const res = await forwardToBackend(bffRequest("/api/bff/users/me"), ["users", "me"], depsWith(fetch));

    expect(res.status).toBe(502);
    expect(await errorCodeOf(res)).toBe("Bff.UpstreamUnavailable");
  });
});
