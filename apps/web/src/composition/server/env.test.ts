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

describe("parseServerEnv: API_ORIGIN ở production (WR-03)", () => {
  const prod = (apiOrigin: string) => ({ API_ORIGIN: apiOrigin, NODE_ENV: "production" });

  it("https ở production → hợp lệ", () => {
    expect(parseServerEnv(prod("https://be.example.com"))).toEqual({ apiOrigin: "https://be.example.com" });
  });

  it("http tới host công khai ở production → ném Error nhắc API_ORIGIN, không kèm giá trị", () => {
    const error = (() => {
      try {
        parseServerEnv(prod("http://be.example.com"));
      } catch (caught) {
        return caught as Error;
      }

      return undefined;
    })();

    expect(error?.message).toMatch(/API_ORIGIN/);
    expect(error?.message).toMatch(/https/);
    expect(error?.message).not.toContain("be.example.com");
  });

  it.each(["http://localhost:5251", "http://127.0.0.1:5000", "http://[::1]:5000"])(
    "http loopback %s ở production → hợp lệ (build/start local với BE local)",
    (origin) => {
      expect(parseServerEnv(prod(origin)).apiOrigin).toBe(new URL(origin).origin);
    },
  );

  it("host giống loopback nhưng không phải (localhost.evil.test) ở production → bị từ chối", () => {
    expect(() => parseServerEnv(prod("http://localhost.evil.test"))).toThrowError(/API_ORIGIN/);
  });

  it("http tới host công khai ở development/test → hợp lệ", () => {
    expect(parseServerEnv({ API_ORIGIN: "http://be.example.com", NODE_ENV: "development" }).apiOrigin).toBe(
      "http://be.example.com",
    );
    expect(parseServerEnv({ API_ORIGIN: "http://be.example.com" }).apiOrigin).toBe("http://be.example.com");
  });

  it("serverDeps đọc NODE_ENV từ process.env: production + http công khai → ném", () => {
    vi.stubEnv("API_ORIGIN", "http://be.example.com");
    vi.stubEnv("NODE_ENV", "production");
    expect(() => serverDeps()).toThrowError(/API_ORIGIN/);
  });
});

describe("parseServerEnv: APP_ORIGIN (WR-04)", () => {
  const base = { API_ORIGIN: "https://be.test" };

  it("thiếu hoặc rỗng = chưa đặt (không có key appOrigin)", () => {
    expect(parseServerEnv(base)).not.toHaveProperty("appOrigin");
    expect(parseServerEnv({ ...base, APP_ORIGIN: "" })).not.toHaveProperty("appOrigin");
    expect(parseServerEnv({ ...base, APP_ORIGIN: "  " })).not.toHaveProperty("appOrigin");
  });

  it("có giá trị → chuẩn hóa về origin (bỏ dấu / cuối)", () => {
    expect(parseServerEnv({ ...base, APP_ORIGIN: "https://app.example.com/" }).appOrigin).toBe(
      "https://app.example.com",
    );
    expect(parseServerEnv({ ...base, APP_ORIGIN: "https://app.example.com:8443" }).appOrigin).toBe(
      "https://app.example.com:8443",
    );
  });

  it.each([
    ["có path", "https://app.example.com/login"],
    ["có query", "https://app.example.com/?a=1"],
    ["có hash", "https://app.example.com/#x"],
    ["có userinfo", "https://user:pw@app.example.com"],
    ["scheme ftp", "ftp://app.example.com"],
    ["không phải URL", "not a url"],
  ])("%s → ném Error nhắc APP_ORIGIN, không kèm giá trị", (_label, value) => {
    const error = (() => {
      try {
        parseServerEnv({ ...base, APP_ORIGIN: value });
      } catch (caught) {
        return caught as Error;
      }

      return undefined;
    })();

    expect(error?.message).toMatch(/APP_ORIGIN/);
    expect(error?.message).not.toContain("user:pw");
  });

  it("production: http công khai bị từ chối, https và http loopback được", () => {
    const prod = { ...base, NODE_ENV: "production" };

    expect(() => parseServerEnv({ ...prod, APP_ORIGIN: "http://app.example.com" })).toThrowError(/APP_ORIGIN/);
    expect(parseServerEnv({ ...prod, APP_ORIGIN: "https://app.example.com" }).appOrigin).toBe(
      "https://app.example.com",
    );
    expect(parseServerEnv({ ...prod, APP_ORIGIN: "http://localhost:3000" }).appOrigin).toBe(
      "http://localhost:3000",
    );
  });

  it("development: http công khai vẫn được", () => {
    expect(parseServerEnv({ ...base, APP_ORIGIN: "http://app.example.com" }).appOrigin).toBe(
      "http://app.example.com",
    );
  });

  it("serverDeps đọc APP_ORIGIN từ process.env lúc gọi", () => {
    vi.stubEnv("API_ORIGIN", "https://be.test");
    vi.stubEnv("APP_ORIGIN", "https://app.example.com");
    expect(serverDeps().env).toEqual({ apiOrigin: "https://be.test", appOrigin: "https://app.example.com" });
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
    vi.stubEnv("API_ORIGIN", "https://be.test");
    vi.stubEnv("NODE_ENV", "production");

    const deps = serverDeps();

    expect(deps.secure).toBe(true);
    expect(typeof deps.fetch).toBe("function");
    expect(Math.abs(deps.nowMs() - Date.now())).toBeLessThan(1000);

    vi.stubEnv("NODE_ENV", "development");

    expect(serverDeps().secure).toBe(false);
  });
});
