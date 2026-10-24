// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  authInvalidCredentialsEnvelope,
  bearerPair,
  beAuthResponse,
  beErrorEnvelope,
  fakeJwt,
  jsonResponse,
  TEST_USER_ID,
  userEmailAlreadyExistsEnvelope,
} from "@/test/be-auth-fixtures";
import { makeRequest, setCookiesOf, TEST_ORIGIN } from "@/test/next-request";
import { handleLogin, handleLogout, handleRegister } from "./auth-handlers";
import type { ServerDeps } from "./env";
import { UPSTREAM_TIMEOUT_MS } from "./upstream";

type FetchArgs = [input: RequestInfo | URL, init?: RequestInit];

const NOW_SEC = 1_790_000_000;
const NOW_MS = NOW_SEC * 1000;
const SEVEN_DAYS_SEC = 7 * 24 * 60 * 60;
const PASSWORD = "Matkhau-Bi-Mat-1!";
const FORBIDDEN_KEYS = /accessToken|refreshToken|expiresAt/;

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

const depsWith = (
  fetch: (...args: FetchArgs) => Promise<Response>,
  secure = true,
): ServerDeps => ({
  env: { apiOrigin: "http://be.test" },
  fetch,
  nowMs: () => NOW_MS,
  secure,
});

const post = (path: string, body: unknown) =>
  makeRequest(path, { method: "POST", origin: TEST_ORIGIN, body });

const crossOriginPost = (path: string, body: unknown) =>
  makeRequest(path, { method: "POST", body, headers: { origin: "https://evil.test" } });

const LOGIN_BODY = { email: "a@b.vn", password: PASSWORD };
const REGISTER_BODY = { email: "a@b.vn", password: PASSWORD, fullName: "Nguyễn Văn Ánh" };

const pair = bearerPair(NOW_SEC, 3600);

/** Phân tích `[url, init]` của lần gọi fetch đầu tiên. */
const firstCall = (fetch: ReturnType<typeof fetchReturning>) => {
  const [input, init] = fetch.mock.calls[0] ?? [];

  return {
    url: String(input),
    init: init ?? {},
    sentBody: JSON.parse(String(init?.body ?? "null")) as Record<string, unknown>,
  };
};

afterEach(() => {
  vi.useRealTimers();
});

describe("handleLogin: thành công", () => {
  it("200: chỉ trả viewer, ghi 3 cookie đúng thuộc tính, không token trong body", async () => {
    const fetch = fetchReturning(jsonResponse(beAuthResponse(pair)));

    const res = await handleLogin(post("/api/auth/login", LOGIN_BODY), depsWith(fetch));
    const text = await res.text();

    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("application/json");
    expect(res.headers.get("cache-control")).toBe("no-store");

    const body = JSON.parse(text) as Record<string, unknown>;

    expect(body).toMatchObject({ status: "success", message: null, errorCode: null });
    expect(body.data).toEqual({
      viewer: {
        id: TEST_USER_ID,
        email: "a@b.vn",
        fullName: "Nguyễn Văn Ánh",
        handle: "a",
        avatarUrl: null,
      },
    });

    // AUTH-02, T-03-27: token không bao giờ về JS.
    expect(text).not.toMatch(FORBIDDEN_KEYS);
    expect(text).not.toContain(pair.accessToken);
    expect(text).not.toContain(pair.refreshToken);
    expect(text).not.toContain(PASSWORD);

    const cookies = setCookiesOf(res);

    expect(Object.keys(cookies).sort()).toEqual(
      ["__Host-tripory_at", "__Host-tripory_at_exp", "__Host-tripory_rt"].sort(),
    );

    for (const name of ["__Host-tripory_at", "__Host-tripory_rt"]) {
      expect(cookies[name]!.attrs).toMatchObject({
        httponly: true,
        secure: true,
        samesite: "lax",
        path: "/",
        "max-age": String(SEVEN_DAYS_SEC),
      });
    }

    expect(cookies["__Host-tripory_at"]!.value).toBe(pair.accessToken);
    expect(cookies["__Host-tripory_rt"]!.value).toBe(pair.refreshToken);
    expect(cookies["__Host-tripory_at_exp"]!.value).toBe(String(NOW_SEC + 3600));
    expect(cookies["__Host-tripory_at_exp"]!.value).toMatch(/^\d+$/);
    expect(cookies["__Host-tripory_at_exp"]!.attrs).not.toHaveProperty("httponly");
  });

  it("secure=false (dev): cookie không prefix __Host- và không Secure", async () => {
    const fetch = fetchReturning(jsonResponse(beAuthResponse(pair)));

    const res = await handleLogin(post("/api/auth/login", LOGIN_BODY), depsWith(fetch, false));
    const cookies = setCookiesOf(res);

    expect(Object.keys(cookies).sort()).toEqual(["tripory_at", "tripory_at_exp", "tripory_rt"].sort());
    expect(cookies["tripory_at"]!.attrs).not.toHaveProperty("secure");
    expect(cookies["tripory_at"]!.attrs).toMatchObject({ httponly: true, samesite: "lax", path: "/" });
  });

  it("avatar riêng của người dùng đi qua; avatar mặc định chung của BE thành null", async () => {
    const base = beAuthResponse(pair);
    const data = base.data as Record<string, unknown>;
    const user = data.user as Record<string, unknown>;
    const withAvatar = {
      ...base,
      data: { ...data, user: { ...user, avatarUrl: "https://cdn.test/anh.png" } },
    };

    const res = await handleLogin(
      post("/api/auth/login", LOGIN_BODY),
      depsWith(fetchReturning(jsonResponse(withAvatar))),
    );
    const body = (await res.json()) as { data: { viewer: { avatarUrl: string | null } } };

    expect(body.data.viewer.avatarUrl).toBe("https://cdn.test/anh.png");
  });

  it("gọi BE đúng đường dẫn, chỉ gửi email+password, header chỉ accept+content-type", async () => {
    const fetch = fetchReturning(jsonResponse(beAuthResponse(pair)));
    const request = makeRequest("/api/auth/login", {
      method: "POST",
      origin: TEST_ORIGIN,
      body: { ...LOGIN_BODY, role: "Admin", isAdmin: true },
      cookies: { "__Host-tripory_at": "cu", "__Host-tripory_rt": "cu" },
      headers: { authorization: "Bearer cu", "x-forwarded-for": "1.2.3.4" },
    });

    await handleLogin(request, depsWith(fetch));

    const call = firstCall(fetch);

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(call.url).toBe("http://be.test/api/v1/auth/login");
    expect(call.init.method).toBe("POST");
    // T-03-32: field thừa của client bị bỏ.
    expect(call.sentBody).toEqual(LOGIN_BODY);
    expect(call.init.headers).toEqual({
      accept: "application/json",
      "content-type": "application/json",
    });
    expect(JSON.stringify(call.init.headers)).not.toMatch(/cookie|authorization|origin/i);
  });
});

describe("handleRegister", () => {
  it("gọi /register đúng 1 lần (không gọi /login), ghi cookie từ token register (D-02)", async () => {
    const fetch = fetchReturning(jsonResponse(beAuthResponse(pair)));

    const res = await handleRegister(post("/api/auth/register", REGISTER_BODY), depsWith(fetch));
    const text = await res.text();

    expect(res.status).toBe(200);
    expect(fetch).toHaveBeenCalledTimes(1);

    const call = firstCall(fetch);

    expect(call.url).toBe("http://be.test/api/v1/auth/register");
    expect(call.sentBody).toEqual(REGISTER_BODY);
    expect(call.url).not.toContain("/login");
    expect(text).not.toMatch(FORBIDDEN_KEYS);
    expect(text).not.toContain(pair.accessToken);
    expect(text).not.toContain(pair.refreshToken);

    const cookies = setCookiesOf(res);

    expect(cookies["__Host-tripory_at"]!.value).toBe(pair.accessToken);
    expect(cookies["__Host-tripory_rt"]!.value).toBe(pair.refreshToken);
  });

  it("bỏ field thừa (confirmPassword, role) trước khi gửi BE", async () => {
    const fetch = fetchReturning(jsonResponse(beAuthResponse(pair)));

    await handleRegister(
      post("/api/auth/register", { ...REGISTER_BODY, confirmPassword: PASSWORD, role: "Admin" }),
      depsWith(fetch),
    );

    expect(firstCall(fetch).sentBody).toEqual(REGISTER_BODY);
  });

  it("thiếu fullName → 400 Bff.InvalidBody, fetch 0 lần", async () => {
    const fetch = fetchReturning(jsonResponse(beAuthResponse(pair)));

    const res = await handleRegister(post("/api/auth/register", LOGIN_BODY), depsWith(fetch));

    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ status: "error", errorCode: "Bff.InvalidBody" });
    expect(fetch).toHaveBeenCalledTimes(0);
  });
});

describe("login/register: lỗi từ BE chuyển nguyên", () => {
  const FLUENT_VALIDATION = beErrorEnvelope("MinimumLengthValidator", "Mật khẩu phải có ít nhất 8 ký tự.");

  it.each([
    ["400 Auth.InvalidCredentials", 400, authInvalidCredentialsEnvelope],
    [
      "400 Email.InvalidFormat",
      400,
      beErrorEnvelope("Email.InvalidFormat", "Định dạng email không hợp lệ."),
    ],
    ["409 User.EmailAlreadyExists", 409, userEmailAlreadyExistsEnvelope],
    ["400 FluentValidation", 400, FLUENT_VALIDATION],
  ])("%s: status + body + content-type nguyên, không Set-Cookie", async (_label, status, envelope) => {
    for (const run of [
      () => handleLogin(post("/api/auth/login", LOGIN_BODY), depsWith(fetchReturning(jsonResponse(envelope, status)))),
      () =>
        handleRegister(
          post("/api/auth/register", REGISTER_BODY),
          depsWith(fetchReturning(jsonResponse(envelope, status))),
        ),
    ]) {
      const res = await run();

      expect(res.status).toBe(status);
      expect(await res.text()).toBe(JSON.stringify(envelope));
      expect(res.headers.get("content-type")).toBe("application/json");
      expect(res.headers.getSetCookie()).toEqual([]);
    }
  });

  it("ProblemDetails 400 giữ nguyên content-type problem+json", async () => {
    const problem = { type: "x", title: "Bad", status: 400, errors: { Email: ["sai"] } };
    const upstream = new Response(JSON.stringify(problem), {
      status: 400,
      headers: { "content-type": "application/problem+json" },
    });

    const res = await handleLogin(post("/api/auth/login", LOGIN_BODY), depsWith(fetchReturning(upstream)));

    expect(res.status).toBe(400);
    expect(res.headers.get("content-type")).toBe("application/problem+json");
    expect(await res.json()).toEqual(problem);
  });

  it.each([
    ["text/html", "<html>proxy error</html>"],
    ["image/svg+xml", "<svg onload=alert(1)/>"],
  ])("BE 4xx content-type %s → 502 Bff.InvalidUpstream, body không lọt về client (WR-01)", async (type, body) => {
    const upstream = new Response(body, { status: 400, headers: { "content-type": type } });

    const res = await handleLogin(post("/api/auth/login", LOGIN_BODY), depsWith(fetchReturning(upstream)));
    const text = await res.text();

    expect(res.status).toBe(502);
    expect(JSON.parse(text)).toMatchObject({ errorCode: "Bff.InvalidUpstream" });
    expect(text).not.toContain("svg");
    expect(res.headers.getSetCookie()).toEqual([]);
  });

  it("BE 4xx JSON đi qua kèm nosniff (form map theo errorCode)", async () => {
    const res = await handleLogin(
      post("/api/auth/login", LOGIN_BODY),
      depsWith(fetchReturning(jsonResponse(beErrorEnvelope("Auth.InvalidCredentials", "Sai."), 401))),
    );

    expect(res.status).toBe(401);
    expect(res.headers.get("x-content-type-options")).toBe("nosniff");
    expect(await res.json()).toMatchObject({ errorCode: "Auth.InvalidCredentials" });
  });

  it("BE 504 → 504 Bff.UpstreamError", async () => {
    const res = await handleLogin(
      post("/api/auth/login", LOGIN_BODY),
      depsWith(fetchReturning(jsonResponse({ title: "gw" }, 504))),
    );

    expect(res.status).toBe(504);
    expect(await res.json()).toMatchObject({ errorCode: "Bff.UpstreamError" });
  });

  it("BE 500 → 502 Bff.UpstreamError, body BE không lọt về; header của BE (set-cookie, x-*) cũng không (T-03-33)", async () => {
    const upstream = new Response(JSON.stringify({ title: "boom", detail: "StackTraceSecret" }), {
      status: 500,
      headers: {
        "content-type": "application/json",
        "set-cookie": "be_session=1; Path=/",
        "x-powered-by": "dotnet",
      },
    });

    const res = await handleLogin(post("/api/auth/login", LOGIN_BODY), depsWith(fetchReturning(upstream)));
    const text = await res.text();

    expect(res.status).toBe(502);
    expect(JSON.parse(text)).toMatchObject({ status: "error", errorCode: "Bff.UpstreamError" });
    expect(text).not.toContain("StackTraceSecret");
    expect(res.headers.getSetCookie()).toEqual([]);
    expect(res.headers.get("x-powered-by")).toBeNull();
    expect(res.headers.get("cache-control")).toBe("no-store");
  });

  it("BE 401 body rỗng: chuyển status, không content-type bịa, không Set-Cookie", async () => {
    const res = await handleLogin(
      post("/api/auth/login", LOGIN_BODY),
      depsWith(fetchReturning(new Response("", { status: 401 }))),
    );

    expect(res.status).toBe(401);
    expect(await res.text()).toBe("");
    expect(res.headers.getSetCookie()).toEqual([]);
  });
});

describe("login/register: Origin và body", () => {
  it.each([
    ["Origin lạ", () => crossOriginPost("/api/auth/login", LOGIN_BODY)],
    ["Origin: null", () => makeRequest("/api/auth/login", { method: "POST", body: LOGIN_BODY, headers: { origin: "null" } })],
    ["thiếu Origin và Sec-Fetch-Site", () => makeRequest("/api/auth/login", { method: "POST", body: LOGIN_BODY })],
  ])("%s → 403 Bff.CrossOrigin, fetch 0 lần, không Set-Cookie", async (_label, build) => {
    const fetch = fetchReturning(jsonResponse(beAuthResponse(pair)));

    const res = await handleLogin(build(), depsWith(fetch));

    expect(res.status).toBe(403);
    expect(await res.json()).toMatchObject({ status: "error", errorCode: "Bff.CrossOrigin" });
    expect(fetch).toHaveBeenCalledTimes(0);
    expect(res.headers.getSetCookie()).toEqual([]);
  });

  it("register với Origin lạ → 403, fetch 0 lần", async () => {
    const fetch = fetchReturning(jsonResponse(beAuthResponse(pair)));

    const res = await handleRegister(crossOriginPost("/api/auth/register", REGISTER_BODY), depsWith(fetch));

    expect(res.status).toBe(403);
    expect(fetch).toHaveBeenCalledTimes(0);
  });

  it.each([
    ["không phải JSON", "đây không phải json"],
    ["JSON null", "null"],
    ["mảng", "[]"],
    ["số", "42"],
    ["chuỗi JSON", '"abc"'],
    ["thiếu password", JSON.stringify({ email: "a@b.vn" })],
    ["thiếu email", JSON.stringify({ password: PASSWORD })],
    ["email không phải chuỗi", JSON.stringify({ email: 123, password: PASSWORD })],
    ["password là object", JSON.stringify({ email: "a@b.vn", password: { x: 1 } })],
    ["password null", JSON.stringify({ email: "a@b.vn", password: null })],
  ])("body %s → 400 Bff.InvalidBody, fetch 0 lần", async (_label, raw) => {
    const fetch = fetchReturning(jsonResponse(beAuthResponse(pair)));
    const request = makeRequest("/api/auth/login", {
      method: "POST",
      origin: TEST_ORIGIN,
      body: raw,
      headers: { "content-type": "application/json" },
    });

    const res = await handleLogin(request, depsWith(fetch));

    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ status: "error", errorCode: "Bff.InvalidBody" });
    expect(fetch).toHaveBeenCalledTimes(0);
    expect(res.headers.getSetCookie()).toEqual([]);
  });

  it("request không có body → 400 Bff.InvalidBody", async () => {
    const fetch = fetchReturning(jsonResponse(beAuthResponse(pair)));

    const res = await handleLogin(
      makeRequest("/api/auth/login", { method: "POST", origin: TEST_ORIGIN }),
      depsWith(fetch),
    );

    expect(res.status).toBe(400);
    expect(fetch).toHaveBeenCalledTimes(0);
  });
});

describe("login/register: lỗi upstream", () => {
  it("timeout → 504 Bff.UpstreamTimeout, không Set-Cookie", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });

    const fetch = hangingFetch();
    const pending = handleLogin(post("/api/auth/login", LOGIN_BODY), depsWith(fetch));

    await vi.waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
    await vi.advanceTimersByTimeAsync(UPSTREAM_TIMEOUT_MS);

    const res = await pending;

    expect(res.status).toBe(504);
    expect(await res.json()).toMatchObject({ status: "error", errorCode: "Bff.UpstreamTimeout" });
    expect(res.headers.getSetCookie()).toEqual([]);
  });

  it("lỗi mạng → 502 Bff.UpstreamUnavailable, không Set-Cookie", async () => {
    const fetch = vi.fn<(...args: FetchArgs) => Promise<Response>>(async () => {
      throw new TypeError("fetch failed");
    });

    const res = await handleRegister(post("/api/auth/register", REGISTER_BODY), depsWith(fetch));

    expect(res.status).toBe(502);
    expect(await res.json()).toMatchObject({ status: "error", errorCode: "Bff.UpstreamUnavailable" });
    expect(res.headers.getSetCookie()).toEqual([]);
  });

  const validAuth = beAuthResponse(pair);
  const validData = validAuth.data as Record<string, unknown>;
  const validUser = validData.user as Record<string, unknown>;

  it.each([
    ["200 body không phải JSON", new Response("<html>gateway</html>", { status: 200 })],
    ["200 body rỗng", new Response("", { status: 200 })],
    ["200 envelope thiếu data", jsonResponse({ status: "success" })],
    ["200 envelope status error", jsonResponse({ ...validAuth, status: "error" })],
    ["200 thiếu user", jsonResponse({ ...validAuth, data: { ...pair } })],
    ["200 thiếu refreshToken", jsonResponse({ ...validAuth, data: { ...validData, refreshToken: undefined } })],
    ["200 user.id không phải GUID", jsonResponse({ ...validAuth, data: { ...validData, user: { ...validUser, id: "khong-phai-guid" } } })],
    [
      "200 access token không có claim hợp lệ",
      jsonResponse({ ...validAuth, data: { ...validData, accessToken: fakeJwt({ exp: 1_790_003_600 }) } }),
    ],
    ["200 access token không phải JWT", jsonResponse({ ...validAuth, data: { ...validData, accessToken: "abc" } })],
    ["200 expiresAt không parse được", jsonResponse({ ...validAuth, data: { ...validData, expiresAt: "hôm qua" } })],
    ["302 chuyển hướng", new Response(null, { status: 302, headers: { location: "https://evil.test/" } })],
  ])("%s → 502 Bff.InvalidUpstream, KHÔNG Set-Cookie", async (_label, upstream) => {
    for (const run of [
      () => handleLogin(post("/api/auth/login", LOGIN_BODY), depsWith(fetchReturning(upstream.clone()))),
      () =>
        handleRegister(post("/api/auth/register", REGISTER_BODY), depsWith(fetchReturning(upstream.clone()))),
    ]) {
      const res = await run();

      expect(res.status).toBe(502);
      expect(await res.json()).toMatchObject({ status: "error", errorCode: "Bff.InvalidUpstream" });
      expect(res.headers.getSetCookie()).toEqual([]);
    }
  });
});

describe("login/register: giới hạn tốc độ của BE (D-35)", () => {
  // Giá trị thử nghiệm, không phải bí mật thật.
  const SECRET = "bi-mat-thu-nghiem";
  const secretDeps = (fetch: (...args: FetchArgs) => Promise<Response>): ServerDeps => ({
    ...depsWith(fetch),
    env: { apiOrigin: "http://be.test", bffSharedSecret: SECRET },
  });
  const RATE_LIMITED = beErrorEnvelope("RateLimit.TooManyRequests", "Bạn thao tác quá nhanh. Vui lòng thử lại sau.");
  const fromIp = { "x-forwarded-for": "203.0.113.7" };

  it.each([
    ["login", "/api/auth/login", LOGIN_BODY, handleLogin],
    ["register", "/api/auth/register", REGISTER_BODY, handleRegister],
  ] as const)("%s: có secret + IP của nền tảng → gửi x-bff-secret và x-forwarded-for", async (_n, path, body, handler) => {
    const fetch = fetchReturning(jsonResponse(beAuthResponse(pair)));
    const request = makeRequest(path, { method: "POST", origin: TEST_ORIGIN, body, headers: fromIp });

    await handler(request, secretDeps(fetch));

    expect(firstCall(fetch).init.headers).toEqual({
      accept: "application/json",
      "content-type": "application/json",
      "x-bff-secret": SECRET,
      "x-forwarded-for": "203.0.113.7",
    });
  });

  it("chuỗi x-forwarded-for do client nhét (nhiều IP) bị bỏ: không gửi secret, không gửi XFF", async () => {
    const fetch = fetchReturning(jsonResponse(beAuthResponse(pair)));
    const request = makeRequest("/api/auth/login", {
      method: "POST",
      origin: TEST_ORIGIN,
      body: LOGIN_BODY,
      headers: { "x-forwarded-for": "6.6.6.6, 203.0.113.7", "x-bff-secret": "gia-mao" },
    });

    await handleLogin(request, secretDeps(fetch));

    expect(firstCall(fetch).init.headers).toEqual({
      accept: "application/json",
      "content-type": "application/json",
    });
  });

  it("chưa cấu hình secret → không gửi header nào dù có IP (hành vi cũ)", async () => {
    const fetch = fetchReturning(jsonResponse(beAuthResponse(pair)));
    const request = makeRequest("/api/auth/login", {
      method: "POST",
      origin: TEST_ORIGIN,
      body: LOGIN_BODY,
      headers: fromIp,
    });

    await handleLogin(request, depsWith(fetch));

    expect(firstCall(fetch).init.headers).toEqual({
      accept: "application/json",
      "content-type": "application/json",
    });
  });

  it.each(["login", "register"] as const)("%s: BE 429 → client nhận 429 nguyên errorCode + message + Retry-After, không Set-Cookie", async (name) => {
    const upstream = new Response(JSON.stringify(RATE_LIMITED), {
      status: 429,
      headers: { "content-type": "application/json", "retry-after": "42", "set-cookie": "be=1" },
    });
    const request =
      name === "login"
        ? post("/api/auth/login", LOGIN_BODY)
        : post("/api/auth/register", REGISTER_BODY);
    const handler = name === "login" ? handleLogin : handleRegister;

    const res = await handler(request, secretDeps(fetchReturning(upstream)));

    expect(res.status).toBe(429);
    expect(res.headers.get("retry-after")).toBe("42");
    expect(res.headers.get("content-type")).toBe("application/json");
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(res.headers.getSetCookie()).toEqual([]);
    expect(await res.json()).toMatchObject({
      status: "error",
      errorCode: "RateLimit.TooManyRequests",
      message: "Bạn thao tác quá nhanh. Vui lòng thử lại sau.",
    });
  });

  it("BE 429 không có Retry-After → không bịa header", async () => {
    const res = await handleLogin(
      post("/api/auth/login", LOGIN_BODY),
      depsWith(fetchReturning(jsonResponse(RATE_LIMITED, 429))),
    );

    expect(res.status).toBe(429);
    expect(res.headers.get("retry-after")).toBeNull();
  });

  it("secret không xuất hiện trong response (kể cả khi BE lỗi)", async () => {
    for (const upstream of [jsonResponse(beAuthResponse(pair)), jsonResponse(RATE_LIMITED, 429), jsonResponse({}, 500)]) {
      const res = await handleLogin(
        makeRequest("/api/auth/login", { method: "POST", origin: TEST_ORIGIN, body: LOGIN_BODY, headers: fromIp }),
        secretDeps(fetchReturning(upstream)),
      );

      expect(await res.text()).not.toContain(SECRET);
      expect(JSON.stringify([...res.headers.entries()])).not.toContain(SECRET);
    }
  });
});

describe("handleLogout", () => {
  it("Origin hợp lệ → 200 data null và 3 Set-Cookie xóa đủ thuộc tính; không gọi BE", async () => {
    const fetch = fetchReturning(jsonResponse({}));

    const res = await handleLogout(post("/api/auth/logout", undefined), depsWith(fetch));

    expect(res.status).toBe(200);
    expect(fetch).toHaveBeenCalledTimes(0);
    expect(res.headers.get("cache-control")).toBe("no-store");

    const lines = res.headers.getSetCookie();

    expect(lines).toHaveLength(3);

    for (const name of ["__Host-tripory_at", "__Host-tripory_rt", "__Host-tripory_at_exp"]) {
      const line = lines.find((entry) => entry.startsWith(`${name}=`));

      expect(line, name).toBeDefined();
      expect(line).toMatch(/Max-Age=0/i);
      expect(line).toMatch(/Path=\//i);
      expect(line).toMatch(/Secure/i);
      expect(line).not.toMatch(/Domain=/i);
    }

    expect(await res.json()).toMatchObject({ status: "success", data: null, message: null, errorCode: null });
  });

  it("secure=false (dev): xóa cookie tên không prefix", async () => {
    const res = await handleLogout(post("/api/auth/logout", undefined), depsWith(fetchReturning(jsonResponse({})), false));
    const cookies = setCookiesOf(res);

    expect(Object.keys(cookies).sort()).toEqual(["tripory_at", "tripory_at_exp", "tripory_rt"].sort());

    for (const cookie of Object.values(cookies)) {
      expect(cookie.value).toBe("");
      expect(cookie.attrs).toMatchObject({ "max-age": "0", path: "/" });
    }
  });

  it.each([
    ["Origin lạ", () => crossOriginPost("/api/auth/logout", undefined)],
    ["thiếu Origin và Sec-Fetch-Site", () => makeRequest("/api/auth/logout", { method: "POST" })],
  ])("%s → 403 Bff.CrossOrigin, không Set-Cookie, không gọi BE (chống CSRF logout)", async (_label, build) => {
    const fetch = fetchReturning(jsonResponse({}));

    const res = await handleLogout(build(), depsWith(fetch));

    expect(res.status).toBe(403);
    expect(await res.json()).toMatchObject({ status: "error", errorCode: "Bff.CrossOrigin" });
    expect(res.headers.getSetCookie()).toEqual([]);
    expect(fetch).toHaveBeenCalledTimes(0);
  });
});
