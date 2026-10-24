// @vitest-environment node
import { NextResponse } from "next/server";
import { describe, expect, it } from "vitest";
import { bearerPair, claimsPayload, fakeJwt, TEST_USER_ID } from "@/test/be-auth-fixtures";
import { setCookiesOf } from "@/test/next-request";
import {
  clearSession,
  decodeJwtPayload,
  readRawTokens,
  readSession,
  readViewerFromCookie,
  writeSession,
} from "./session-store";

const NOW_SEC = 1_790_000_000;
const NOW_MS = NOW_SEC * 1000;
const SEVEN_DAYS_SEC = 7 * 24 * 60 * 60;

const getterOf =
  (cookies: Readonly<Record<string, string>>) =>
  (name: string): string | undefined =>
    cookies[name];

/** Cookie access/refresh dạng không secure (tên không prefix) để dựng cho readSession. */
const plainJar = (access: string | undefined, refresh: string | undefined) =>
  getterOf({
    ...(access === undefined ? {} : { tripory_at: access }),
    ...(refresh === undefined ? {} : { tripory_rt: refresh }),
  });

describe("decodeJwtPayload", () => {
  it("giải mã payload tiếng Việt có dấu bằng UTF-8", () => {
    const token = fakeJwt(claimsPayload({ name: "Nguyễn Văn Ánh" }));

    expect(decodeJwtPayload(token)).toMatchObject({ name: "Nguyễn Văn Ánh", handle: "a" });
  });

  it.each([
    ["không đủ 3 đoạn (1 đoạn)", "abc"],
    ["không đủ 3 đoạn (2 đoạn)", "abc.def"],
    ["quá 3 đoạn", "a.b.c.d"],
    ["đoạn giữa rỗng", "a..c"],
    ["base64 hỏng", "a.!!!.c"],
    ["JSON hỏng", `a.${Buffer.from("không phải json", "utf8").toString("base64url")}.c`],
    ["chuỗi rỗng", ""],
  ])("trả null khi token hỏng: %s", (_label, token) => {
    expect(decodeJwtPayload(token)).toBeNull();
  });
});

describe("writeSession", () => {
  it("secure: ghi 3 cookie đúng thuộc tính, Max-Age theo expiresAt của BE", () => {
    const pair = bearerPair(NOW_SEC, 3600);
    const res = new NextResponse(null);

    const result = writeSession(res, pair, NOW_MS, true);

    expect(result.ok).toBe(true);

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
      expect(cookies[name]!.attrs).not.toHaveProperty("domain");
    }

    expect(cookies["__Host-tripory_at"]!.value).toBe(pair.accessToken);
    expect(cookies["__Host-tripory_rt"]!.value).toBe(pair.refreshToken);
  });

  it("cookie at_exp KHÔNG HttpOnly, chỉ chứa số giây bằng exp của access token", () => {
    const res = new NextResponse(null);

    const result = writeSession(res, bearerPair(NOW_SEC, 3600), NOW_MS, true);
    const exp = cookiesExp(res);

    expect(exp.value).toMatch(/^\d+$/);
    expect(exp.value).toBe(String(NOW_SEC + 3600));
    expect(exp.attrs).not.toHaveProperty("httponly");
    expect(exp.attrs).toMatchObject({
      secure: true,
      samesite: "lax",
      path: "/",
      "max-age": String(SEVEN_DAYS_SEC),
    });
    expect(result).toMatchObject({ ok: true, claims: { exp: NOW_SEC + 3600, userId: TEST_USER_ID } });
  });

  it("không secure: tên không prefix và không có Secure", () => {
    const res = new NextResponse(null);

    writeSession(res, bearerPair(NOW_SEC, 3600), NOW_MS, false);

    const cookies = setCookiesOf(res);

    expect(Object.keys(cookies).sort()).toEqual(["tripory_at", "tripory_at_exp", "tripory_rt"].sort());

    for (const cookie of Object.values(cookies)) {
      expect(cookie.attrs).not.toHaveProperty("secure");
      expect(cookie.attrs).toMatchObject({ samesite: "lax", path: "/" });
    }
  });

  it("expiresAt đã qua → Max-Age=0", () => {
    const pair = { ...bearerPair(NOW_SEC, 3600), expiresAt: new Date(NOW_MS - 60_000).toISOString() };
    const res = new NextResponse(null);

    expect(writeSession(res, pair, NOW_MS, true).ok).toBe(true);

    for (const cookie of Object.values(setCookiesOf(res))) {
      expect(cookie.attrs["max-age"]).toBe("0");
    }
  });

  it("làm tròn xuống Max-Age theo giây", () => {
    const pair = { ...bearerPair(NOW_SEC, 3600), expiresAt: new Date(NOW_MS + 90_999).toISOString() };
    const res = new NextResponse(null);

    writeSession(res, pair, NOW_MS, true);

    expect(setCookiesOf(res)["__Host-tripory_at"]!.attrs["max-age"]).toBe("90");
  });

  it("expiresAt không parse được → { ok: false } và KHÔNG ghi cookie nào", () => {
    const pair = { ...bearerPair(NOW_SEC, 3600), expiresAt: "không phải ngày" };
    const res = new NextResponse(null);

    expect(writeSession(res, pair, NOW_MS, true)).toEqual({ ok: false });
    expect(res.headers.getSetCookie()).toEqual([]);
  });

  it.each([
    ["không phải JWT", "not-a-jwt"],
    ["payload thiếu exp", fakeJwt({ ...claimsPayload(), exp: undefined })],
    ["payload thiếu id", fakeJwt({ name: "x", exp: NOW_SEC + 3600 })],
  ])("access token %s → { ok: false } và KHÔNG ghi cookie nào", (_label, accessToken) => {
    const pair = { ...bearerPair(NOW_SEC, 3600), accessToken };
    const res = new NextResponse(null);

    expect(writeSession(res, pair, NOW_MS, true)).toEqual({ ok: false });
    expect(res.headers.getSetCookie()).toEqual([]);
  });

  it("không ghi token ra chỗ nào ngoài giá trị cookie access/refresh", () => {
    const pair = bearerPair(NOW_SEC, 3600);
    const res = new NextResponse(null);

    writeSession(res, pair, NOW_MS, true);

    const atExp = cookiesExp(res);

    expect(atExp.value).not.toContain(pair.accessToken);
    expect(atExp.value).not.toContain(pair.refreshToken);
  });
});

describe("clearSession", () => {
  it("secure: 3 Set-Cookie rỗng với Secure, Path=/, Max-Age=0 (khóa Pitfall 2 của __Host-)", () => {
    const res = new NextResponse(null);

    clearSession(res, true);

    const lines = res.headers.getSetCookie();

    expect(lines).toHaveLength(3);

    for (const line of lines) {
      expect(line).toMatch(/;\s*Secure/i);
      expect(line).toMatch(/;\s*Path=\//i);
      expect(line).toMatch(/;\s*Max-Age=0/i);
      expect(line).toMatch(/SameSite=lax/i);
      expect(line).not.toMatch(/Domain=/i);
    }

    const cookies = setCookiesOf(res);

    expect(Object.keys(cookies).sort()).toEqual(
      ["__Host-tripory_at", "__Host-tripory_at_exp", "__Host-tripory_rt"].sort(),
    );

    for (const cookie of Object.values(cookies)) expect(cookie.value).toBe("");
  });

  it("cookie access/refresh vẫn HttpOnly, at_exp thì không", () => {
    const res = new NextResponse(null);

    clearSession(res, true);

    const cookies = setCookiesOf(res);

    expect(cookies["__Host-tripory_at"]!.attrs).toHaveProperty("httponly", true);
    expect(cookies["__Host-tripory_rt"]!.attrs).toHaveProperty("httponly", true);
    expect(cookies["__Host-tripory_at_exp"]!.attrs).not.toHaveProperty("httponly");
  });

  it("không secure: tên không prefix, không Secure, vẫn Max-Age=0 và Path=/", () => {
    const res = new NextResponse(null);

    clearSession(res, false);

    const cookies = setCookiesOf(res);

    expect(Object.keys(cookies).sort()).toEqual(["tripory_at", "tripory_at_exp", "tripory_rt"].sort());

    for (const cookie of Object.values(cookies)) {
      expect(cookie.attrs).not.toHaveProperty("secure");
      expect(cookie.attrs).toMatchObject({ "max-age": "0", path: "/" });
    }
  });
});

describe("readRawTokens", () => {
  it("trả cả hai token khi đủ", () => {
    expect(readRawTokens(plainJar("at", "rt"), false)).toEqual({ accessToken: "at", refreshToken: "rt" });
  });

  it("null khi thiếu một trong hai hoặc rỗng", () => {
    expect(readRawTokens(plainJar("at", undefined), false)).toBeNull();
    expect(readRawTokens(plainJar(undefined, "rt"), false)).toBeNull();
    expect(readRawTokens(plainJar("", "rt"), false)).toBeNull();
    expect(readRawTokens(plainJar("at", ""), false)).toBeNull();
    expect(readRawTokens(plainJar(undefined, undefined), false)).toBeNull();
  });

  it("đọc đúng tên cookie theo secure", () => {
    const jar = getterOf({ "__Host-tripory_at": "at", "__Host-tripory_rt": "rt" });

    expect(readRawTokens(jar, true)).toEqual({ accessToken: "at", refreshToken: "rt" });
    expect(readRawTokens(jar, false)).toBeNull();
  });
});

describe("readSession", () => {
  const jarWithExp = (exp: number) => plainJar(fakeJwt(claimsPayload({ exp })), "rt");

  it("không có cookie access → none", () => {
    expect(readSession(plainJar(undefined, undefined), NOW_SEC, false)).toEqual({ state: "none" });
    expect(readSession(plainJar(undefined, "rt"), NOW_SEC, false)).toEqual({ state: "none" });
  });

  it("có access nhưng thiếu refresh → invalid", () => {
    expect(readSession(plainJar(fakeJwt(claimsPayload({ exp: NOW_SEC + 3600 })), undefined), NOW_SEC, false)).toEqual({
      state: "invalid",
    });
  });

  it("có cả hai nhưng claim hỏng → invalid", () => {
    expect(readSession(plainJar("not-a-jwt", "rt"), NOW_SEC, false)).toEqual({ state: "invalid" });
    expect(readSession(plainJar(fakeJwt({ exp: NOW_SEC + 3600 }), "rt"), NOW_SEC, false)).toEqual({
      state: "invalid",
    });
  });

  it("biên STALE_AT_SEC: còn đúng 30 giây là stale, 31 giây là fresh", () => {
    expect(readSession(jarWithExp(NOW_SEC + 30), NOW_SEC, false).state).toBe("stale");
    expect(readSession(jarWithExp(NOW_SEC + 31), NOW_SEC, false).state).toBe("fresh");
  });

  it("đã hết hạn → stale (refresh token còn nên vẫn hồi phục được)", () => {
    expect(readSession(jarWithExp(NOW_SEC - 10), NOW_SEC, false).state).toBe("stale");
  });

  it("fresh kèm accessToken và claims", () => {
    const accessToken = fakeJwt(claimsPayload({ exp: NOW_SEC + 3600 }));

    const session = readSession(plainJar(accessToken, "rt"), NOW_SEC, false);

    expect(session).toMatchObject({
      state: "fresh",
      accessToken,
      claims: { exp: NOW_SEC + 3600, userId: TEST_USER_ID, fullName: "Nguyễn Văn Ánh" },
    });
  });

  it("stale kèm claims nhưng KHÔNG mang accessToken", () => {
    const session = readSession(jarWithExp(NOW_SEC + 5), NOW_SEC, false);

    expect(session).toMatchObject({ state: "stale", claims: { exp: NOW_SEC + 5 } });
    expect(session).not.toHaveProperty("accessToken");
  });

  it("round-trip: đọc lại đúng thứ writeSession vừa ghi", () => {
    const pair = bearerPair(NOW_SEC, 3600);
    const res = new NextResponse(null);

    writeSession(res, pair, NOW_MS, true);

    const stored = setCookiesOf(res);
    const get = (name: string) => stored[name]?.value;

    expect(readSession(get, NOW_SEC, true)).toMatchObject({ state: "fresh", accessToken: pair.accessToken });
    expect(readRawTokens(get, true)).toEqual({ accessToken: pair.accessToken, refreshToken: pair.refreshToken });
  });
});

describe("readViewerFromCookie", () => {
  it("trả Viewer từ claim, avatarUrl null", () => {
    const get = plainJar(fakeJwt(claimsPayload({ exp: NOW_SEC + 3600 })), "rt");

    expect(readViewerFromCookie(get, false)).toEqual({
      id: TEST_USER_ID,
      email: "a@b.vn",
      fullName: "Nguyễn Văn Ánh",
      handle: "a",
      avatarUrl: null,
    });
  });

  it("vẫn trả Viewer khi token đã hết hạn (chỉ để hiển thị)", () => {
    const get = plainJar(fakeJwt(claimsPayload({ exp: NOW_SEC - 86_400 })), "rt");

    expect(readViewerFromCookie(get, false)).toMatchObject({ id: TEST_USER_ID });
  });

  it("null khi không có cookie hoặc claim hỏng", () => {
    expect(readViewerFromCookie(plainJar(undefined, undefined), false)).toBeNull();
    expect(readViewerFromCookie(plainJar("not-a-jwt", "rt"), false)).toBeNull();
    expect(readViewerFromCookie(plainJar(fakeJwt({ name: "x" }), "rt"), false)).toBeNull();
  });

  it("đọc theo tên cookie secure", () => {
    const get = getterOf({ "__Host-tripory_at": fakeJwt(claimsPayload()) });

    expect(readViewerFromCookie(get, true)).toMatchObject({ id: TEST_USER_ID });
    expect(readViewerFromCookie(get, false)).toBeNull();
  });
});

/** Cookie `at_exp` ở chế độ secure từ response vừa ghi. */
function cookiesExp(res: NextResponse) {
  const cookie = setCookiesOf(res)["__Host-tripory_at_exp"];

  if (cookie === undefined) throw new Error("Thiếu cookie at_exp");

  return cookie;
}
