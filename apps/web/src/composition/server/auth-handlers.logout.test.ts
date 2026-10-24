// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { bearerPair, fakeJwt, jsonResponse } from "@/test/be-auth-fixtures";
import { makeRequest, TEST_ORIGIN } from "@/test/next-request";
import { handleLogout } from "./auth-handlers";
import type { ServerDeps } from "./env";

type FetchArgs = [input: RequestInfo | URL, init?: RequestInit];

const NOW_SEC = 1_790_000_000;
const NOW_MS = NOW_SEC * 1000;
// Giá trị thử nghiệm, không phải bí mật thật.
const SECRET = "bi-mat-thu-nghiem";

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
  env: { apiOrigin: "http://be.test", bffSharedSecret: SECRET },
  fetch,
  nowMs: () => NOW_MS,
  secure: true,
});

const sessionCookies = (expiresInSec: number) => {
  const pair = bearerPair(NOW_SEC, expiresInSec);

  return { pair, cookies: { [AT]: pair.accessToken, [RT]: pair.refreshToken } };
};

const logoutRequest = (cookies: Record<string, string>, headers: Record<string, string> = {}) =>
  makeRequest("/api/auth/logout", { method: "POST", origin: TEST_ORIGIN, cookies, headers });

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

/** Response phải y hệt logout thành công trước D-36, bất kể BE trả gì. */
const expectSameSuccess = async (res: Response, ...secrets: string[]) => {
  const text = await res.text();

  expect(res.status).toBe(200);
  expect(res.headers.get("cache-control")).toBe("no-store");
  expect(res.headers.get("x-content-type-options")).toBe("nosniff");
  expect(JSON.parse(text)).toMatchObject({ status: "success", data: null, message: null, errorCode: null });
  expectSessionCleared(res);

  for (const secret of secrets) expect(text).not.toContain(secret);
};

afterEach(() => {
  vi.useRealTimers();
});

describe("handleLogout: gọi BE thu hồi refresh token (D-36)", () => {
  it("session tươi → gọi BE đúng 1 lần với URL, method, Bearer, body; response không rò", async () => {
    const { cookies, pair } = sessionCookies(3600);
    const fetch = fetchReturning(
      new Response(JSON.stringify({ status: "success", data: {}, leak: "BeBodySecret" }), {
        status: 200,
        headers: { "content-type": "application/json", "set-cookie": "be=1; Path=/", "x-be": "1" },
      }),
    );

    const res = await handleLogout(
      logoutRequest(cookies, { "x-forwarded-for": "1.2.3.4" }),
      depsWith(fetch),
    );

    expect(fetch).toHaveBeenCalledTimes(1);

    const [input, init] = fetch.mock.calls[0] ?? [];

    expect(String(input)).toBe("http://be.test/api/v1/auth/logout");
    expect(init?.method).toBe("POST");
    // Không X-Bff-Secret / X-Forwarded-For dù env có secret và request có XFF; không cookie/origin của client.
    expect(init?.headers).toEqual({
      accept: "application/json",
      "content-type": "application/json",
      authorization: `Bearer ${pair.accessToken}`,
    });
    expect(JSON.parse(String(init?.body))).toEqual({ refreshToken: pair.refreshToken });

    await expectSameSuccess(res, pair.accessToken, pair.refreshToken, "BeBodySecret", SECRET);
    expect(res.headers.get("x-be")).toBeNull();
    expect(res.headers.getSetCookie().some((line) => line.startsWith("be="))).toBe(false);
  });

  it("dùng timeout ngắn 4000 ms cho lệnh gọi BE", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });

    const { cookies } = sessionCookies(3600);
    const fetch = hangingFetch();
    const pending = handleLogout(logoutRequest(cookies), depsWith(fetch));

    // Không dùng `vi.waitFor`: dưới fake timer nó tự đẩy đồng hồ và làm sai mốc 4000 ms.
    await vi.advanceTimersByTimeAsync(0);
    expect(fetch).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(3999);
    expect(fetch.mock.calls[0]?.[1]?.signal?.aborted).toBe(false);

    await vi.advanceTimersByTimeAsync(1);
    expect(fetch.mock.calls[0]?.[1]?.signal?.aborted).toBe(true);

    await expectSameSuccess(await pending);
  });

  it("còn 31 giây vẫn là fresh (ngưỡng stale ≤ 30) → gọi BE", async () => {
    const { cookies } = sessionCookies(31);
    const fetch = fetchReturning(jsonResponse({}));

    await handleLogout(logoutRequest(cookies), depsWith(fetch));

    expect(fetch).toHaveBeenCalledTimes(1);
  });
});

describe("handleLogout: không gọi BE", () => {
  it.each([
    ["access hết hạn", -100],
    ["access stale (còn 30 giây)", 30],
  ])("%s → fetch 0 lần, vẫn xóa cookie", async (_label, expiresInSec) => {
    const { cookies } = sessionCookies(expiresInSec);
    const fetch = fetchReturning(jsonResponse({}));

    const res = await handleLogout(logoutRequest(cookies), depsWith(fetch));

    expect(fetch).toHaveBeenCalledTimes(0);
    await expectSameSuccess(res);
  });

  it("thiếu refresh cookie → fetch 0 lần, vẫn xóa cookie", async () => {
    const { pair } = sessionCookies(3600);
    const fetch = fetchReturning(jsonResponse({}));

    const res = await handleLogout(logoutRequest({ [AT]: pair.accessToken }), depsWith(fetch));

    expect(fetch).toHaveBeenCalledTimes(0);
    await expectSameSuccess(res);
  });

  it("claim của access hỏng → fetch 0 lần, vẫn xóa cookie", async () => {
    const { pair } = sessionCookies(3600);
    const fetch = fetchReturning(jsonResponse({}));

    const res = await handleLogout(
      logoutRequest({ [AT]: fakeJwt({ exp: NOW_SEC + 3600 }), [RT]: pair.refreshToken }),
      depsWith(fetch),
    );

    expect(fetch).toHaveBeenCalledTimes(0);
    await expectSameSuccess(res);
  });

  it("không có cookie nào → fetch 0 lần, vẫn 200 và xóa cookie", async () => {
    const fetch = fetchReturning(jsonResponse({}));

    const res = await handleLogout(logoutRequest({}), depsWith(fetch));

    expect(fetch).toHaveBeenCalledTimes(0);
    await expectSameSuccess(res);
  });

  it.each([
    ["Origin lạ", { headers: { origin: "https://evil.test" } }],
    ["thiếu Origin và Sec-Fetch-Site", {}],
  ])("%s → 403, fetch 0 lần, không đụng cookie", async (_label, extra) => {
    const { cookies } = sessionCookies(3600);
    const fetch = fetchReturning(jsonResponse({}));
    const request = makeRequest("/api/auth/logout", { method: "POST", cookies, ...extra });

    const res = await handleLogout(request, depsWith(fetch));

    expect(res.status).toBe(403);
    expect(await res.json()).toMatchObject({ status: "error", errorCode: "Bff.CrossOrigin" });
    expect(fetch).toHaveBeenCalledTimes(0);
    expect(res.headers.getSetCookie()).toEqual([]);
  });
});

describe("handleLogout: BE lỗi vẫn không chặn logout", () => {
  it.each([
    ["404 (endpoint chưa deploy)", new Response("", { status: 404 })],
    ["405", new Response("", { status: 405 })],
    ["401", new Response("", { status: 401 })],
    ["500 có body", jsonResponse({ detail: "StackTraceSecret" }, 500)],
    ["302", new Response(null, { status: 302, headers: { location: "https://evil.test/" } })],
    ["200 body sai định dạng", new Response("<html>không phải json", { status: 200 })],
  ])("BE %s → vẫn xóa hết cookie và trả cùng response thành công", async (_label, upstream) => {
    const { cookies, pair } = sessionCookies(3600);
    const fetch = fetchReturning(upstream);

    const res = await handleLogout(logoutRequest(cookies), depsWith(fetch));

    expect(fetch).toHaveBeenCalledTimes(1);
    await expectSameSuccess(res, pair.accessToken, pair.refreshToken, "StackTraceSecret");
  });

  it("fetch ném lỗi mạng → vẫn thành công", async () => {
    const { cookies } = sessionCookies(3600);
    const fetch = vi.fn<(...args: FetchArgs) => Promise<Response>>(async () => {
      throw new TypeError("fetch failed");
    });

    await expectSameSuccess(await handleLogout(logoutRequest(cookies), depsWith(fetch)));
  });

  it("timeout → vẫn thành công", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });

    const { cookies } = sessionCookies(3600);
    const fetch = hangingFetch();
    const pending = handleLogout(logoutRequest(cookies), depsWith(fetch));

    await vi.waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
    await vi.advanceTimersByTimeAsync(4000);

    await expectSameSuccess(await pending);
  });

  it("callBackend ném ngoại lệ (deps.fetch ném đồng bộ) → vẫn thành công", async () => {
    const { cookies } = sessionCookies(3600);
    const fetch = vi.fn<(...args: FetchArgs) => Promise<Response>>(() => {
      throw new Error("đồng bộ");
    });

    await expectSameSuccess(await handleLogout(logoutRequest(cookies), depsWith(fetch)));
  });

  it("secure=false (dev) vẫn gọi BE và xóa cookie tên không prefix", async () => {
    const pair = bearerPair(NOW_SEC, 3600);
    const fetch = fetchReturning(jsonResponse({}));
    const request = logoutRequest({ tripory_at: pair.accessToken, tripory_rt: pair.refreshToken });

    const res = await handleLogout(request, { ...depsWith(fetch), secure: false });

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(res.status).toBe(200);
    expect(res.headers.getSetCookie().map((line) => line.split("=")[0]).sort()).toEqual([
      "tripory_at",
      "tripory_at_exp",
      "tripory_rt",
    ]);
  });
});
