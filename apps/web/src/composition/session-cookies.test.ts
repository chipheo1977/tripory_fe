import { afterEach, describe, expect, it, vi } from "vitest";
import {
  hasSessionCookie,
  isSecureCookieEnv,
  readAccessExpFromCookieString,
  sessionCookieNames,
} from "./session-cookies";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("sessionCookieNames", () => {
  it("dùng prefix __Host- khi secure", () => {
    expect(sessionCookieNames(true)).toEqual({
      access: "__Host-tripory_at",
      refresh: "__Host-tripory_rt",
      accessExp: "__Host-tripory_at_exp",
    });
  });

  it("bỏ prefix khi không secure (dev qua http)", () => {
    expect(sessionCookieNames(false)).toEqual({
      access: "tripory_at",
      refresh: "tripory_rt",
      accessExp: "tripory_at_exp",
    });
  });
});

describe("isSecureCookieEnv", () => {
  it("đúng ở production", () => {
    vi.stubEnv("NODE_ENV", "production");

    expect(isSecureCookieEnv()).toBe(true);
  });

  it.each(["development", "test"])("sai ở %s", (env) => {
    vi.stubEnv("NODE_ENV", env);

    expect(isSecureCookieEnv()).toBe(false);
  });
});

describe("hasSessionCookie", () => {
  const jar = (...names: string[]) => ({ has: (name: string) => names.includes(name) });

  it("true khi có cookie access", () => {
    expect(hasSessionCookie(jar("__Host-tripory_at"), true)).toBe(true);
    expect(hasSessionCookie(jar("tripory_at"), false)).toBe(true);
  });

  it("chỉ kiểm cookie access, refresh đứng một mình không đủ", () => {
    expect(hasSessionCookie(jar("__Host-tripory_rt", "__Host-tripory_at_exp"), true)).toBe(false);
  });

  it("không lẫn tên giữa môi trường secure và không secure", () => {
    expect(hasSessionCookie(jar("tripory_at"), true)).toBe(false);
    expect(hasSessionCookie(jar("__Host-tripory_at"), false)).toBe(false);
  });
});

describe("readAccessExpFromCookieString", () => {
  it("đọc số giây từ chuỗi document.cookie", () => {
    expect(
      readAccessExpFromCookieString("theme=dark; __Host-tripory_at_exp=1791890410; other=1", true),
    ).toBe(1791890410);
    expect(readAccessExpFromCookieString("tripory_at_exp=1791890410", false)).toBe(1791890410);
  });

  it("null khi thiếu cookie hoặc chuỗi rỗng", () => {
    expect(readAccessExpFromCookieString("", true)).toBeNull();
    expect(readAccessExpFromCookieString("theme=dark", true)).toBeNull();
    expect(readAccessExpFromCookieString("tripory_at_exp=1791890410", true)).toBeNull();
  });

  it.each(["", "abc", "0", "-5", "12.5", "1e9", "123abc", "99999999999999999999999"])(
    "null khi giá trị là %j (không phải số nguyên dương)",
    (value) => {
      expect(readAccessExpFromCookieString(`tripory_at_exp=${value}`, false)).toBeNull();
    },
  );

  it("không nhầm tên cookie có chung hậu tố", () => {
    expect(readAccessExpFromCookieString("x_tripory_at_exp=123", false)).toBeNull();
  });
});
