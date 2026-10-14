// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { parseServerEnv, serverDeps } from "./env";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("parseServerEnv", () => {
  it("chỉ giữ origin, bỏ path và dấu gạch cuối", () => {
    expect(parseServerEnv({ API_ORIGIN: "http://localhost:5000/" })).toEqual({
      apiOrigin: "http://localhost:5000",
    });
    expect(parseServerEnv({ API_ORIGIN: "https://be.example.com/api/v1/ignored?x=1" })).toEqual({
      apiOrigin: "https://be.example.com",
    });
  });

  it.each([
    ["thiếu", {}],
    ["rỗng", { API_ORIGIN: "" }],
    ["scheme ftp", { API_ORIGIN: "ftp://x" }],
    ["không phải URL", { API_ORIGIN: "not a url" }],
  ])("ném Error nhắc API_ORIGIN khi %s", (_label, raw) => {
    expect(() => parseServerEnv(raw)).toThrowError(/API_ORIGIN/);
  });
});

describe("serverDeps", () => {
  it("đọc process.env lúc gọi, không lúc import", () => {
    // Import ở đầu file khi chưa có biến vẫn không ném; chỉ lúc gọi mới đọc.
    vi.stubEnv("API_ORIGIN", "");
    expect(() => serverDeps()).toThrowError(/API_ORIGIN/);

    vi.stubEnv("API_ORIGIN", "http://be.test/");
    expect(serverDeps().env).toEqual({ apiOrigin: "http://be.test" });
  });

  it("secure theo NODE_ENV, nowMs là đồng hồ hệ thống, fetch gọi được", () => {
    vi.stubEnv("API_ORIGIN", "http://be.test");
    vi.stubEnv("NODE_ENV", "production");

    const deps = serverDeps();

    expect(deps.secure).toBe(true);
    expect(typeof deps.fetch).toBe("function");
    expect(Math.abs(deps.nowMs() - Date.now())).toBeLessThan(1000);

    vi.stubEnv("NODE_ENV", "development");

    expect(serverDeps().secure).toBe(false);
  });
});
