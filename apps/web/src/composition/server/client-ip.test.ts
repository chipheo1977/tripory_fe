// @vitest-environment node
import { describe, expect, it } from "vitest";
import { deriveClientIp } from "./client-ip";

const headersOf = (init: Record<string, string>) => new Headers(init);

describe("deriveClientIp", () => {
  it("không có header nào → null", () => {
    expect(deriveClientIp(headersOf({}))).toBeNull();
  });

  it.each([
    ["x-vercel-forwarded-for", "203.0.113.7"],
    ["x-real-ip", "203.0.113.8"],
    ["x-forwarded-for", "203.0.113.9"],
  ])("đọc %s khi là một IPv4 hợp lệ", (name, ip) => {
    expect(deriveClientIp(headersOf({ [name]: ip }))).toBe(ip);
  });

  it("nhận IPv6", () => {
    expect(deriveClientIp(headersOf({ "x-forwarded-for": "2001:db8::1" }))).toBe("2001:db8::1");
  });

  it("ưu tiên x-vercel-forwarded-for rồi x-real-ip rồi x-forwarded-for", () => {
    expect(
      deriveClientIp(
        headersOf({
          "x-forwarded-for": "10.0.0.3",
          "x-real-ip": "10.0.0.2",
          "x-vercel-forwarded-for": "10.0.0.1",
        }),
      ),
    ).toBe("10.0.0.1");
    expect(deriveClientIp(headersOf({ "x-forwarded-for": "10.0.0.3", "x-real-ip": "10.0.0.2" }))).toBe(
      "10.0.0.2",
    );
  });

  it("cắt khoảng trắng hai đầu", () => {
    expect(deriveClientIp(headersOf({ "x-real-ip": "  203.0.113.7 " }))).toBe("203.0.113.7");
  });

  it.each([
    ["chuỗi nhiều IP (không đoán phần tử nào)", "1.2.3.4, 5.6.7.8"],
    ["không phải IP", "not-an-ip"],
    ["IPv4 thiếu octet", "1.2.3"],
    ["IPv4 vượt dải", "256.1.1.1"],
    ["IP kèm port", "1.2.3.4:8080"],
    ["IP kèm chèn header", "1.2.3.4\r\nx-bff-secret: x"],
    ["rỗng", ""],
  ])("bỏ qua giá trị không hợp lệ: %s", (_label, value) => {
    // Header Web chặn CRLF khi đặt qua constructor, nên với ca đó dùng `Pick<Headers, "get">` giả.
    const fake = { get: (name: string) => (name === "x-forwarded-for" ? value : null) };

    expect(deriveClientIp(fake)).toBeNull();
  });

  it("header ưu tiên cao không hợp lệ thì thử header kế tiếp", () => {
    expect(
      deriveClientIp(headersOf({ "x-vercel-forwarded-for": "garbage", "x-real-ip": "203.0.113.7" })),
    ).toBe("203.0.113.7");
  });
});
