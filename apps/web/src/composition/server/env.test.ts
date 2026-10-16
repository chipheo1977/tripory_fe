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

  it("BFF_SHARED_SECRET: thiếu hoặc rỗng = chưa đặt (không có key), có giá trị thì giữ nguyên", () => {
    expect(parseServerEnv({ API_ORIGIN: "http://be.test" })).not.toHaveProperty("bffSharedSecret");
    expect(parseServerEnv({ API_ORIGIN: "http://be.test", BFF_SHARED_SECRET: "" })).not.toHaveProperty(
      "bffSharedSecret",
    );
    expect(parseServerEnv({ API_ORIGIN: "http://be.test", BFF_SHARED_SECRET: "gia-tri-thu-nghiem" })).toEqual({
      apiOrigin: "http://be.test",
      bffSharedSecret: "gia-tri-thu-nghiem",
    });
  });

  it("BFF_SHARED_SECRET chứa ký tự điều khiển → ném Error KHÔNG kèm giá trị", () => {
    const bad = "abc\r\nx-injected: 1";
    const error = (() => {
      try {
        parseServerEnv({ API_ORIGIN: "http://be.test", BFF_SHARED_SECRET: bad });
      } catch (caught) {
        return caught as Error;
      }

      return undefined;
    })();

    expect(error?.message).toMatch(/BFF_SHARED_SECRET/);
    expect(error?.message).not.toContain("abc");
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

  it("đọc BFF_SHARED_SECRET từ process.env lúc gọi; rỗng thì không có key", () => {
    vi.stubEnv("API_ORIGIN", "http://be.test");
    vi.stubEnv("BFF_SHARED_SECRET", "");
    expect(serverDeps().env).toEqual({ apiOrigin: "http://be.test" });

    vi.stubEnv("BFF_SHARED_SECRET", "gia-tri-thu-nghiem");
    expect(serverDeps().env).toEqual({ apiOrigin: "http://be.test", bffSharedSecret: "gia-tri-thu-nghiem" });
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
