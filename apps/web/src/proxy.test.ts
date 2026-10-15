// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { makeRequest } from "@/test/next-request";
import { config, PROTECTED_PREFIXES, proxy } from "./proxy";

const SESSION_COOKIE = { tripory_at: "opaque-not-decoded" };

/** `NextResponse.next()` gắn header `x-middleware-next`, redirect thì có `location`. */
const locationOf = (response: Response) => response.headers.get("location");
const passesThrough = (response: Response) =>
  locationOf(response) === null && response.headers.get("x-middleware-next") === "1";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("proxy: khách chưa có cookie phiên", () => {
  it("redirect trang bảo vệ sang /login kèm next đã mã hóa (giữ cả query)", () => {
    const response = proxy(makeRequest("/itineraries/mine?x=1"));

    expect(response.status).toBe(307);
    expect(locationOf(response)).toBe("https://app.test/login?next=%2Fitineraries%2Fmine%3Fx%3D1");
  });

  it("redirect /settings/password sang /login?next=", () => {
    const response = proxy(makeRequest("/settings/password"));

    expect(response.status).toBe(307);
    expect(locationOf(response)).toBe("https://app.test/login?next=%2Fsettings%2Fpassword");
  });

  it.each(["/", "/login", "/register", "/not-a-route"])("cho qua %s", (path) => {
    expect(passesThrough(proxy(makeRequest(path)))).toBe(true);
  });

  it("không coi /itineraries/minefoo là route bảo vệ (khớp theo segment)", () => {
    expect(passesThrough(proxy(makeRequest("/itineraries/minefoo")))).toBe(true);
  });

  it("route con của prefix bảo vệ vẫn bị gate", () => {
    const response = proxy(makeRequest("/itineraries/mine/draft"));

    expect(locationOf(response)).toBe("https://app.test/login?next=%2Fitineraries%2Fmine%2Fdraft");
  });

  it("bỏ tham số nội bộ _rsc và __next* khỏi next (Pitfall 8)", () => {
    const response = proxy(makeRequest("/itineraries/mine?_rsc=abc&x=1&__nextDataReq=1"));

    expect(locationOf(response)).toBe("https://app.test/login?next=%2Fitineraries%2Fmine%3Fx%3D1");
  });

  it("không để lại dấu ? khi chỉ còn tham số nội bộ", () => {
    const response = proxy(makeRequest("/itineraries/mine?_rsc=abc"));

    expect(locationOf(response)).toBe("https://app.test/login?next=%2Fitineraries%2Fmine");
  });
});

describe("proxy: đã có cookie phiên", () => {
  it("đẩy /login sang trang mặc định khi không có next", () => {
    const response = proxy(makeRequest("/login", { cookies: SESSION_COOKIE }));

    expect(response.status).toBe(307);
    expect(locationOf(response)).toBe("https://app.test/itineraries/mine");
  });

  it("đẩy /login sang next hợp lệ", () => {
    const response = proxy(makeRequest("/login?next=%2Fsettings%2Fpassword", { cookies: SESSION_COOKIE }));

    expect(locationOf(response)).toBe("https://app.test/settings/password");
  });

  it.each([
    ["/register?next=//evil.com", "next // (protocol-relative)"],
    ["/login?next=https://evil.com", "next tuyệt đối khác origin"],
    ["/login?next=/login", "next trỏ lại /login"],
  ])("%s rơi về trang mặc định (%s)", (path) => {
    const response = proxy(makeRequest(path, { cookies: SESSION_COOKIE }));

    expect(locationOf(response)).toBe("https://app.test/itineraries/mine");
  });

  it("cho qua trang bảo vệ dù access token đã hết hạn: proxy không giải mã (D-25)", () => {
    const expired = { tripory_at: "x.eyJleHAiOjF9.sig" };

    expect(passesThrough(proxy(makeRequest("/itineraries/mine", { cookies: expired })))).toBe(true);
  });

  it("cho qua các trang công khai", () => {
    expect(passesThrough(proxy(makeRequest("/", { cookies: SESSION_COOKIE })))).toBe(true);
  });

  it("production dùng cookie có prefix __Host-", () => {
    vi.stubEnv("NODE_ENV", "production");

    const withPlain = proxy(makeRequest("/login", { cookies: SESSION_COOKIE }));
    const withHost = proxy(makeRequest("/login", { cookies: { "__Host-tripory_at": "opaque" } }));

    expect(passesThrough(withPlain)).toBe(true);
    expect(locationOf(withHost)).toBe("https://app.test/itineraries/mine");
  });
});

describe("proxy: cấu hình", () => {
  it("PROTECTED_PREFIXES phủ itineraries/mine và settings", () => {
    expect([...PROTECTED_PREFIXES]).toEqual(["/itineraries/mine", "/settings"]);
  });

  it("matcher là mảng hằng loại trừ api, tài nguyên tĩnh và file có đuôi", () => {
    expect(Array.isArray(config.matcher)).toBe(true);

    const [pattern] = config.matcher;
    const regex = new RegExp(`^${pattern}$`);

    expect(pattern).toContain("api/");
    expect(pattern).toContain("_next/static");
    expect(pattern).toContain("_next/image");
    expect(pattern).toContain("favicon.ico");
    expect(pattern).toContain("icon.svg");
    expect(regex.test("/itineraries/mine")).toBe(true);
    expect(regex.test("/login")).toBe(true);
    expect(regex.test("/api/bff/users")).toBe(false);
    expect(regex.test("/_next/static/chunk.js")).toBe(false);
    expect(regex.test("/logo.png")).toBe(false);
  });
});
