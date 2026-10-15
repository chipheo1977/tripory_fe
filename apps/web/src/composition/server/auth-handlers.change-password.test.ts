// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  authInvalidCurrentPasswordEnvelope,
  bearerPair,
  beErrorEnvelope,
  fakeJwt,
  jsonResponse,
  notEqualValidatorEnvelope,
} from "@/test/be-auth-fixtures";
import { makeRequest, setCookiesOf, TEST_ORIGIN } from "@/test/next-request";
import { handleChangePassword } from "./auth-handlers";
import type { ServerDeps } from "./env";
import { UPSTREAM_TIMEOUT_MS } from "./upstream";

type FetchArgs = [input: RequestInfo | URL, init?: RequestInit];

const NOW_SEC = 1_790_000_000;
const NOW_MS = NOW_SEC * 1000;
const CURRENT = "Mat-Khau-Cu-1!";
const NEXT = "Mat-Khau-Moi-2!";
const BODY = { currentPassword: CURRENT, newPassword: NEXT };

const AT = "__Host-tripory_at";
const RT = "__Host-tripory_rt";
const AT_EXP = "__Host-tripory_at_exp";

const beOk = {
  status: "success",
  data: null,
  message: null,
  errorCode: null,
  timestamp: "2026-10-13T08:00:00+00:00",
};

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

const sessionCookies = (expiresInSec: number) => {
  const pair = bearerPair(NOW_SEC, expiresInSec);

  return { pair, cookies: { [AT]: pair.accessToken, [RT]: pair.refreshToken } };
};

const changeRequest = (
  cookies: Record<string, string>,
  body: unknown = BODY,
  extra: { headers?: Record<string, string> } = {},
) =>
  makeRequest("/api/auth/change-password", {
    method: "PUT",
    origin: TEST_ORIGIN,
    cookies,
    body,
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

const expectNoPasswords = (text: string) => {
  expect(text).not.toContain(CURRENT);
  expect(text).not.toContain(NEXT);
};

afterEach(() => {
  vi.useRealTimers();
});

describe("handleChangePassword: thành công", () => {
  it("fresh + BE 200 → 200 data null và xóa cả 3 cookie (D-18)", async () => {
    const { cookies, pair } = sessionCookies(3600);
    const fetch = fetchReturning(jsonResponse(beOk));

    const res = await handleChangePassword(changeRequest(cookies), depsWith(fetch));
    const text = await res.text();

    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(JSON.parse(text)).toMatchObject({ status: "success", data: null, message: null, errorCode: null });
    expectSessionCleared(res);
    expectNoPasswords(text);
    expect(text).not.toContain(pair.accessToken);
    expect(text).not.toContain(pair.refreshToken);
  });

  it("gửi PUT change-password với Bearer từ cookie, body đúng 2 field, không chuyển cookie", async () => {
    const { cookies, pair } = sessionCookies(3600);
    const fetch = fetchReturning(jsonResponse(beOk));
    const request = changeRequest(
      cookies,
      { ...BODY, confirmPassword: NEXT, role: "Admin" },
      { headers: { "x-forwarded-for": "1.2.3.4" } },
    );

    await handleChangePassword(request, depsWith(fetch));

    expect(fetch).toHaveBeenCalledTimes(1);

    const [input, init] = fetch.mock.calls[0] ?? [];

    expect(String(input)).toBe("http://be.test/api/v1/auth/change-password");
    expect(init?.method).toBe("PUT");
    expect(init?.headers).toEqual({
      accept: "application/json",
      "content-type": "application/json",
      authorization: `Bearer ${pair.accessToken}`,
    });
    expect(JSON.stringify(init?.headers)).not.toMatch(/cookie|origin/i);
    // T-03-32: field thừa của client (confirmPassword, role) bị bỏ.
    expect(JSON.parse(String(init?.body))).toEqual(BODY);
  });

  it("không trim mật khẩu: khoảng trắng đầu/cuối đi nguyên tới BE", async () => {
    const { cookies } = sessionCookies(3600);
    const fetch = fetchReturning(jsonResponse(beOk));
    const spaced = { currentPassword: "  cu  ", newPassword: "  moi  " };

    await handleChangePassword(changeRequest(cookies, spaced), depsWith(fetch));

    expect(JSON.parse(String(fetch.mock.calls[0]?.[1]?.body))).toEqual(spaced);
  });

  it("BE 200 với body lạ vẫn xóa phiên: phiên chấm dứt ở server bất kể BE trả gì (T-03-34)", async () => {
    const { cookies } = sessionCookies(3600);

    const res = await handleChangePassword(
      changeRequest(cookies),
      depsWith(fetchReturning(new Response("", { status: 200 }))),
    );

    expect(res.status).toBe(200);
    expectSessionCleared(res);
  });

  it("còn 31 giây vẫn là fresh (ngưỡng stale là ≤ 30)", async () => {
    const { cookies } = sessionCookies(31);
    const fetch = fetchReturning(jsonResponse(beOk));

    const res = await handleChangePassword(changeRequest(cookies), depsWith(fetch));

    expect(res.status).toBe(200);
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});

describe("handleChangePassword: trạng thái phiên", () => {
  it("không có cookie (none) → 401 session.expired, fetch 0 lần", async () => {
    const fetch = fetchReturning(jsonResponse(beOk));

    const res = await handleChangePassword(changeRequest({}), depsWith(fetch));

    expect(res.status).toBe(401);
    expect(await res.json()).toMatchObject({ status: "error", errorCode: "session.expired", data: null });
    expect(fetch).toHaveBeenCalledTimes(0);
  });

  it.each([
    ["thiếu cookie refresh", (pair: ReturnType<typeof bearerPair>) => ({ [AT]: pair.accessToken })],
    [
      "claim của access hỏng",
      (pair: ReturnType<typeof bearerPair>) => ({ [AT]: fakeJwt({ exp: NOW_SEC + 3600 }), [RT]: pair.refreshToken }),
    ],
    [
      "access không phải JWT",
      (pair: ReturnType<typeof bearerPair>) => ({ [AT]: "abc", [RT]: pair.refreshToken }),
    ],
  ])("invalid (%s) → 401 session.expired + xóa cookie, fetch 0 lần", async (_label, build) => {
    const { pair } = sessionCookies(3600);
    const fetch = fetchReturning(jsonResponse(beOk));

    const res = await handleChangePassword(changeRequest(build(pair)), depsWith(fetch));

    expect(res.status).toBe(401);
    expect(await res.json()).toMatchObject({ errorCode: "session.expired" });
    expectSessionCleared(res);
    expect(fetch).toHaveBeenCalledTimes(0);
  });

  it.each([
    ["còn 30 giây", 30],
    ["còn 10 giây", 10],
    ["đã hết hạn", -100],
  ])("stale (%s) → 401 session.expired, fetch 0 lần, KHÔNG xóa cookie", async (_label, expiresInSec) => {
    const { cookies } = sessionCookies(expiresInSec);
    const fetch = fetchReturning(jsonResponse(beOk));

    const res = await handleChangePassword(changeRequest(cookies), depsWith(fetch));

    expect(res.status).toBe(401);
    expect(await res.json()).toMatchObject({ status: "error", errorCode: "session.expired" });
    // Client sẽ refresh rồi phát lại: cookie phải còn nguyên để refresh có token mà xoay.
    expect(res.headers.getSetCookie()).toEqual([]);
    expect(setCookiesOf(res)).toEqual({});
    expect(fetch).toHaveBeenCalledTimes(0);
  });
});

describe("handleChangePassword: lỗi BE", () => {
  it.each([
    ["400 Auth.InvalidCurrentPassword", 400, authInvalidCurrentPasswordEnvelope],
    ["400 NotEqualValidator", 400, notEqualValidatorEnvelope],
    ["400 MinimumLengthValidator", 400, beErrorEnvelope("MinimumLengthValidator", "Mật khẩu quá ngắn.")],
  ])("%s → status/body/content-type nguyên, KHÔNG xóa cookie (D-19)", async (_label, status, envelope) => {
    const { cookies } = sessionCookies(3600);

    const res = await handleChangePassword(
      changeRequest(cookies),
      depsWith(fetchReturning(jsonResponse(envelope, status))),
    );
    const text = await res.text();

    expect(res.status).toBe(status);
    expect(text).toBe(JSON.stringify(envelope));
    expect(res.headers.get("content-type")).toBe("application/json");
    expect(res.headers.getSetCookie()).toEqual([]);
    expectNoPasswords(text);
  });

  it("BE 401 (Bearer bị từ chối, body rỗng) → 401 session.expired của FE, không xóa cookie", async () => {
    const { cookies } = sessionCookies(3600);

    const res = await handleChangePassword(
      changeRequest(cookies),
      depsWith(fetchReturning(new Response("", { status: 401 }))),
    );

    expect(res.status).toBe(401);
    expect(await res.json()).toMatchObject({ status: "error", errorCode: "session.expired", data: null });
    expect(res.headers.getSetCookie()).toEqual([]);
  });

  it("BE 500 chuyển nguyên; header của BE không lọt về client; giữ cookie", async () => {
    const { cookies } = sessionCookies(3600);
    const upstream = new Response(JSON.stringify({ title: "boom" }), {
      status: 500,
      headers: { "content-type": "application/json", "set-cookie": "be=1; Path=/", "x-powered-by": "dotnet" },
    });

    const res = await handleChangePassword(changeRequest(cookies), depsWith(fetchReturning(upstream)));

    expect(res.status).toBe(500);
    expect(res.headers.getSetCookie()).toEqual([]);
    expect(res.headers.get("x-powered-by")).toBeNull();
  });

  it("BE 302 → 502 Bff.InvalidUpstream, giữ cookie", async () => {
    const { cookies } = sessionCookies(3600);

    const res = await handleChangePassword(
      changeRequest(cookies),
      depsWith(fetchReturning(new Response(null, { status: 302, headers: { location: "https://evil.test/" } }))),
    );

    expect(res.status).toBe(502);
    expect(await res.json()).toMatchObject({ errorCode: "Bff.InvalidUpstream" });
    expect(res.headers.getSetCookie()).toEqual([]);
  });

  it("lỗi mạng → 502 Bff.UpstreamUnavailable, giữ cookie", async () => {
    const { cookies } = sessionCookies(3600);
    const fetch = vi.fn<(...args: FetchArgs) => Promise<Response>>(async () => {
      throw new TypeError("fetch failed");
    });

    const res = await handleChangePassword(changeRequest(cookies), depsWith(fetch));
    const text = await res.text();

    expect(res.status).toBe(502);
    expect(JSON.parse(text)).toMatchObject({ errorCode: "Bff.UpstreamUnavailable" });
    expect(res.headers.getSetCookie()).toEqual([]);
    expectNoPasswords(text);
  });

  it("timeout upstream → 504 Bff.UpstreamTimeout, giữ cookie", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });

    const { cookies } = sessionCookies(3600);
    const fetch = hangingFetch();
    const pending = handleChangePassword(changeRequest(cookies), depsWith(fetch));

    await vi.waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
    await vi.advanceTimersByTimeAsync(UPSTREAM_TIMEOUT_MS);

    const res = await pending;

    expect(res.status).toBe(504);
    expect(await res.json()).toMatchObject({ errorCode: "Bff.UpstreamTimeout" });
    expect(res.headers.getSetCookie()).toEqual([]);
  });
});

describe("handleChangePassword: Origin và body", () => {
  it.each([
    ["Origin lạ", { headers: { origin: "https://evil.test" } }],
    ["Origin: null", { headers: { origin: "null" } }],
  ])("%s → 403 Bff.CrossOrigin, fetch 0 lần, không đụng cookie", async (_label, extra) => {
    const { cookies } = sessionCookies(3600);
    const fetch = fetchReturning(jsonResponse(beOk));
    const request = makeRequest("/api/auth/change-password", {
      method: "PUT",
      cookies,
      body: BODY,
      ...extra,
    });

    const res = await handleChangePassword(request, depsWith(fetch));

    expect(res.status).toBe(403);
    expect(await res.json()).toMatchObject({ status: "error", errorCode: "Bff.CrossOrigin" });
    expect(fetch).toHaveBeenCalledTimes(0);
    expect(res.headers.getSetCookie()).toEqual([]);
  });

  it("thiếu Origin và Sec-Fetch-Site → 403, fetch 0 lần", async () => {
    const { cookies } = sessionCookies(3600);
    const fetch = fetchReturning(jsonResponse(beOk));

    const res = await handleChangePassword(
      makeRequest("/api/auth/change-password", { method: "PUT", cookies, body: BODY }),
      depsWith(fetch),
    );

    expect(res.status).toBe(403);
    expect(fetch).toHaveBeenCalledTimes(0);
  });

  it.each([
    ["không phải JSON", "đây không phải json"],
    ["JSON null", "null"],
    ["mảng", "[]"],
    ["thiếu newPassword", JSON.stringify({ currentPassword: CURRENT })],
    ["thiếu currentPassword", JSON.stringify({ newPassword: NEXT })],
    ["currentPassword là số", JSON.stringify({ currentPassword: 123, newPassword: NEXT })],
    ["newPassword là null", JSON.stringify({ currentPassword: CURRENT, newPassword: null })],
  ])("body %s → 400 Bff.InvalidBody, fetch 0 lần, giữ cookie", async (_label, raw) => {
    const { cookies } = sessionCookies(3600);
    const fetch = fetchReturning(jsonResponse(beOk));

    const res = await handleChangePassword(
      changeRequest(cookies, raw, { headers: { "content-type": "application/json" } }),
      depsWith(fetch),
    );
    const text = await res.text();

    expect(res.status).toBe(400);
    expect(JSON.parse(text)).toMatchObject({ status: "error", errorCode: "Bff.InvalidBody" });
    expect(fetch).toHaveBeenCalledTimes(0);
    expect(res.headers.getSetCookie()).toEqual([]);
    expectNoPasswords(text);
  });
});
