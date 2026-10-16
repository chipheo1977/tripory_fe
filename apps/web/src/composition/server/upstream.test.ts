// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ServerDeps } from "./env";
import { callBackend, UPSTREAM_TIMEOUT_MS } from "./upstream";

type FetchArgs = [input: RequestInfo | URL, init?: RequestInit];

const API_ORIGIN = "http://be.test";

const urlOf = (input: RequestInfo | URL): string =>
  typeof input === "string" ? input : input instanceof URL ? input.href : input.url;

const jsonResponse = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

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
  env: { apiOrigin: API_ORIGIN },
  fetch,
  nowMs: () => 0,
  secure: false,
});

const initOf = (fetch: ReturnType<typeof fetchReturning>): RequestInit => fetch.mock.calls[0]?.[1] ?? {};

afterEach(() => {
  vi.useRealTimers();
});

describe("UPSTREAM_TIMEOUT_MS", () => {
  it("là 28 giây, nhỏ hơn timeout client 30 giây", () => {
    expect(UPSTREAM_TIMEOUT_MS).toBe(28_000);
  });
});

describe("callBackend: phản hồi", () => {
  it("200 JSON → kind response kèm body text và content-type", async () => {
    const fetch = fetchReturning(jsonResponse({ ok: true }));

    const result = await callBackend(depsWith(fetch), "/api/v1/auth/login", { method: "POST" });

    expect(result).toEqual({
      kind: "response",
      status: 200,
      body: '{"ok":true}',
      contentType: "application/json",
    });
  });

  it.each([400, 401, 500])("%i vẫn là kind response với status và body nguyên", async (status) => {
    const fetch = fetchReturning(jsonResponse({ errorCode: "X" }, status));

    const result = await callBackend(depsWith(fetch), "/api/v1/users/me", { method: "GET" });

    expect(result).toEqual({
      kind: "response",
      status,
      body: '{"errorCode":"X"}',
      contentType: "application/json",
    });
  });

  it("thiếu content-type → contentType null", async () => {
    const fetch = fetchReturning(new Response(null, { status: 204 }));

    const result = await callBackend(depsWith(fetch), "/api/v1/users/me", { method: "GET" });

    expect(result).toEqual({ kind: "response", status: 204, body: "", contentType: null });
  });

  it("3xx của BE được chuyển như response, không bị theo (chống SSRF qua redirect)", async () => {
    const fetch = fetchReturning(
      new Response(null, { status: 302, headers: { location: "http://169.254.169.254/latest" } }),
    );

    const result = await callBackend(depsWith(fetch), "/api/v1/users/me", { method: "GET" });

    expect(result).toMatchObject({ kind: "response", status: 302 });
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(initOf(fetch).redirect).toBe("manual");
  });
});

describe("callBackend: lời gọi fetch", () => {
  it("gọi đúng URL BE với cache no-store, redirect manual, signal, method, headers, body", async () => {
    const fetch = fetchReturning(jsonResponse({}));

    await callBackend(depsWith(fetch), "/api/v1/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: '{"email":"a@b.vn"}',
    });

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(urlOf(fetch.mock.calls[0]![0])).toBe("http://be.test/api/v1/auth/login");

    const init = initOf(fetch);

    expect(init.cache).toBe("no-store");
    expect(init.redirect).toBe("manual");
    expect(init.method).toBe("POST");
    expect(init.headers).toEqual({ "content-type": "application/json", accept: "application/json" });
    expect(init.body).toBe('{"email":"a@b.vn"}');
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });

  it("giữ nguyên query string", async () => {
    const fetch = fetchReturning(jsonResponse({}));

    await callBackend(depsWith(fetch), "/api/v1/users?page=2&q=%C4%90%C3%A0", { method: "GET" });

    expect(urlOf(fetch.mock.calls[0]![0])).toBe("http://be.test/api/v1/users?page=2&q=%C4%90%C3%A0");
  });

  it("gọi fetch như hàm trần (không mất this)", async () => {
    const seen: unknown[] = [];
    const fetch = vi.fn(function (this: unknown) {
      seen.push(this);

      return Promise.resolve(jsonResponse({}));
    });

    await callBackend(depsWith(fetch), "/api/v1/users/me", { method: "GET" });

    expect(seen[0]).toBeUndefined();
  });
});

describe("callBackend: header giới hạn tốc độ (D-35)", () => {
  // Giá trị thử nghiệm, không phải bí mật thật.
  const SECRET = "bi-mat-thu-nghiem";
  const withSecret = (fetch: (...args: FetchArgs) => Promise<Response>): ServerDeps => ({
    ...depsWith(fetch),
    env: { apiOrigin: API_ORIGIN, bffSharedSecret: SECRET },
  });
  const baseHeaders = { accept: "application/json", "content-type": "application/json" };

  it("có secret + IP hợp lệ → gửi x-bff-secret và x-forwarded-for", async () => {
    const fetch = fetchReturning(jsonResponse({}));

    await callBackend(withSecret(fetch), "/api/v1/auth/login", {
      method: "POST",
      headers: baseHeaders,
      clientIp: "203.0.113.7",
    });

    expect(initOf(fetch).headers).toEqual({
      ...baseHeaders,
      "x-bff-secret": SECRET,
      "x-forwarded-for": "203.0.113.7",
    });
  });

  it("chưa cấu hình secret → không gửi header nào dù có IP", async () => {
    const fetch = fetchReturning(jsonResponse({}));

    await callBackend(depsWith(fetch), "/api/v1/auth/login", {
      method: "POST",
      headers: baseHeaders,
      clientIp: "203.0.113.7",
    });

    expect(initOf(fetch).headers).toEqual(baseHeaders);
  });

  it.each([null, undefined, "", "not-an-ip", "1.2.3.4, 5.6.7.8"])(
    "có secret nhưng IP %j không dùng được → không gửi cả secret",
    async (clientIp) => {
      const fetch = fetchReturning(jsonResponse({}));

      await callBackend(withSecret(fetch), "/api/v1/auth/login", {
        method: "POST",
        headers: baseHeaders,
        clientIp,
      });

      expect(initOf(fetch).headers).toEqual(baseHeaders);
      expect(JSON.stringify(initOf(fetch).headers)).not.toContain(SECRET);
    },
  );

  it("không truyền clientIp (change-password, proxy /api/bff) → không gửi secret", async () => {
    const fetch = fetchReturning(jsonResponse({}));

    await callBackend(withSecret(fetch), "/api/v1/auth/change-password", {
      method: "PUT",
      headers: baseHeaders,
    });

    expect(initOf(fetch).headers).toEqual(baseHeaders);
  });

  it("loại x-bff-secret / x-forwarded-for do người gọi nhét vào headers (mọi kiểu hoa thường)", async () => {
    const fetch = fetchReturning(jsonResponse({}));

    await callBackend(withSecret(fetch), "/api/v1/users/me", {
      method: "GET",
      headers: { ...baseHeaders, "X-Bff-Secret": "gia-mao", "X-Forwarded-For": "6.6.6.6" },
    });
    await callBackend(depsWith(fetch), "/api/v1/users/me", {
      method: "GET",
      headers: { ...baseHeaders, "x-bff-secret": "gia-mao", "x-forwarded-for": "6.6.6.6" },
    });

    for (const call of fetch.mock.calls) expect(call[1]?.headers).toEqual(baseHeaders);
  });

  it("không có headers và không có secret → headers undefined như cũ", async () => {
    const fetch = fetchReturning(jsonResponse({}));

    await callBackend(depsWith(fetch), "/api/v1/users/me", { method: "GET" });

    expect(initOf(fetch).headers).toBeUndefined();
  });

  it("thông điệp lỗi URL không chứa secret", async () => {
    const error = await callBackend(withSecret(fetchReturning(jsonResponse({}))), "https://evil.test/x", {
      method: "POST",
      clientIp: "203.0.113.7",
    }).catch((caught: unknown) => caught);

    expect(String(error)).not.toContain(SECRET);
  });
});

describe("callBackend: Retry-After", () => {
  it.each([
    ["60", "60"],
    [" 3600 ", "3600"],
  ])("429 có Retry-After %j → retryAfter %j", async (header, expected) => {
    const fetch = fetchReturning(
      new Response("{}", { status: 429, headers: { "content-type": "application/json", "retry-after": header } }),
    );

    const result = await callBackend(depsWith(fetch), "/api/v1/auth/login", { method: "POST" });

    expect(result).toMatchObject({ kind: "response", status: 429, retryAfter: expected });
  });

  it.each(["Wed, 21 Oct 2026 07:28:00 GMT", "abc", "-1", "1e9", "123456789"])(
    "Retry-After %j không phải số giây ngắn → bỏ",
    async (header) => {
      const fetch = fetchReturning(new Response("{}", { status: 429, headers: { "retry-after": header } }));

      const result = await callBackend(depsWith(fetch), "/api/v1/auth/login", { method: "POST" });

      expect(result).not.toHaveProperty("retryAfter");
    },
  );
});

describe("callBackend: URL bị khóa vào API_ORIGIN", () => {
  it.each([
    ["đường dẫn không bắt đầu /api/v1/", "/auth/login"],
    ["đúng /api/v1 nhưng thiếu dấu gạch cuối", "/api/v1"],
    ["protocol-relative đổi host", "//evil.test/api/v1/x"],
    ["dấu \\ bị coi là / và đổi host", "\\\\evil.test/api/v1/x"],
    ["URL tuyệt đối sang origin khác", "https://evil.test/api/v1/x"],
    ["cùng host khác port", "http://be.test:81/api/v1/x"],
    ["cùng host khác scheme", "https://be.test/api/v1/x"],
    ["../ thoát khỏi /api/v1/ sau chuẩn hóa", "/api/v1/../x"],
    ["%2e%2e thoát khỏi /api/v1/ sau chuẩn hóa", "/api/v1/%2e%2e/x"],
    ["rỗng", ""],
  ])("ném Error và không gọi fetch: %s", async (_label, path) => {
    const fetch = fetchReturning(jsonResponse({}));

    await expect(callBackend(depsWith(fetch), path, { method: "GET" })).rejects.toThrowError(
      "Upstream URL không hợp lệ",
    );
    expect(fetch).not.toHaveBeenCalled();
  });

  it("thông điệp lỗi không chứa đường dẫn người gọi đưa vào", async () => {
    const fetch = fetchReturning(jsonResponse({}));

    const error = await callBackend(depsWith(fetch), "https://evil.test/secret-token-123", {
      method: "GET",
    }).catch((caught: unknown) => caught);

    expect(String(error)).not.toContain("secret-token-123");
  });
});

describe("callBackend: timeout và lỗi mạng", () => {
  it("chưa settle ở 27 999 ms, trả kind timeout ở 28 000 ms và abort signal", async () => {
    vi.useFakeTimers();
    const fetch = hangingFetch();
    let outcome: unknown = "pending";
    const settled = callBackend(depsWith(fetch), "/api/v1/users/me", { method: "GET" }).then((value) => {
      outcome = value;
    });

    await vi.advanceTimersByTimeAsync(UPSTREAM_TIMEOUT_MS - 1);
    expect(outcome).toBe("pending");

    await vi.advanceTimersByTimeAsync(1);
    await settled;

    expect(outcome).toEqual({ kind: "timeout" });
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch.mock.calls[0]![1]!.signal!.aborted).toBe(true);
  });

  it("timeout cả khi header đã về nhưng body treo", async () => {
    vi.useFakeTimers();
    const slowBodyFetch = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      const slow = {
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        text: () =>
          new Promise<string>((_resolve, reject) => {
            init?.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")), {
              once: true,
            });
          }),
      };

      return slow as unknown as Response;
    });
    const settled = callBackend(depsWith(slowBodyFetch), "/api/v1/users/me", { method: "GET" });

    await vi.advanceTimersByTimeAsync(UPSTREAM_TIMEOUT_MS);

    await expect(settled).resolves.toEqual({ kind: "timeout" });
  });

  it("fetch ném lỗi mạng → kind network", async () => {
    const fetch = vi.fn<(...args: FetchArgs) => Promise<Response>>(async () => {
      throw new TypeError("fetch failed");
    });

    const result = await callBackend(depsWith(fetch), "/api/v1/users/me", { method: "GET" });

    expect(result).toEqual({ kind: "network" });
  });

  it("dọn timer sau khi xong, kể cả khi lỗi mạng", async () => {
    vi.useFakeTimers();

    await callBackend(depsWith(fetchReturning(jsonResponse({}))), "/api/v1/users/me", { method: "GET" });
    expect(vi.getTimerCount()).toBe(0);

    const failing = vi.fn<(...args: FetchArgs) => Promise<Response>>(async () => {
      throw new TypeError("fetch failed");
    });

    await callBackend(depsWith(failing), "/api/v1/users/me", { method: "GET" });
    expect(vi.getTimerCount()).toBe(0);
  });
});
