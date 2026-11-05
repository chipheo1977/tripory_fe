// @vitest-environment node
import { describe, expect, it } from "vitest";
import { makeRequest } from "@/test/next-request";
import { checkSameOrigin, errorEnvelope, successEnvelope } from "./request-guards";

const APP_ORIGIN = "https://app.test";

describe("checkSameOrigin", () => {
  it("Origin bằng origin của app là hợp lệ", () => {
    const request = makeRequest("/api/auth/login", { method: "POST", origin: APP_ORIGIN });

    expect(checkSameOrigin(request)).toBe(true);
  });

  it("Origin khác bị từ chối", () => {
    const request = makeRequest("/api/auth/login", {
      method: "POST",
      headers: { origin: "https://evil.test" },
    });

    expect(checkSameOrigin(request)).toBe(false);
  });

  it("Origin là chuỗi 'null' bị từ chối", () => {
    const request = makeRequest("/api/auth/login", { method: "POST", headers: { origin: "null" } });

    expect(checkSameOrigin(request)).toBe(false);
  });

  it("Origin khác scheme hoặc port bị từ chối", () => {
    for (const origin of ["http://app.test", "https://app.test:8443"]) {
      const request = makeRequest("/api/auth/login", { method: "POST", headers: { origin } });

      expect(checkSameOrigin(request)).toBe(false);
    }
  });

  it("Origin lạ bị từ chối kể cả khi Sec-Fetch-Site nói same-origin", () => {
    const request = makeRequest("/api/auth/login", {
      method: "POST",
      headers: { origin: "https://evil.test", "sec-fetch-site": "same-origin" },
    });

    expect(checkSameOrigin(request)).toBe(false);
  });

  it("GET và HEAD thiếu Origin được qua", () => {
    expect(checkSameOrigin(makeRequest("/api/bff/users/me"))).toBe(true);
    expect(checkSameOrigin(makeRequest("/api/bff/users/me", { method: "HEAD" }))).toBe(true);
  });

  it.each(["POST", "PUT", "DELETE"])("%s thiếu Origin + sec-fetch-site cross-site bị từ chối", (method) => {
    const request = makeRequest("/api/auth/login", {
      method,
      headers: { "sec-fetch-site": "cross-site" },
    });

    expect(checkSameOrigin(request)).toBe(false);
  });

  it.each(["POST", "PUT", "DELETE"])("%s thiếu Origin + same-origin được qua", (method) => {
    const request = makeRequest("/api/auth/login", {
      method,
      headers: { "sec-fetch-site": "same-origin" },
    });

    expect(checkSameOrigin(request)).toBe(true);
  });

  it("POST thiếu cả Origin lẫn Sec-Fetch-Site (curl) bị từ chối", () => {
    expect(checkSameOrigin(makeRequest("/api/auth/login", { method: "POST" }))).toBe(false);
  });

  it("POST thiếu Origin + same-site hoặc none bị từ chối", () => {
    for (const site of ["same-site", "none"]) {
      const request = makeRequest("/api/auth/login", {
        method: "POST",
        headers: { "sec-fetch-site": site },
      });

      expect(checkSameOrigin(request)).toBe(false);
    }
  });
});

describe("checkSameOrigin: APP_ORIGIN (WR-04)", () => {
  // nextUrl.origin của makeRequest là https://app.test: giả lập origin nội bộ sau proxy ghi lại Host.
  const PUBLIC_ORIGIN = "https://www.example.com";

  it("không đặt appOrigins → vẫn so với nextUrl.origin (hành vi cũ)", () => {
    const ok = makeRequest("/api/auth/login", { method: "POST", origin: APP_ORIGIN });
    const wrong = makeRequest("/api/auth/login", { method: "POST", headers: { origin: PUBLIC_ORIGIN } });

    expect(checkSameOrigin(ok, undefined)).toBe(true);
    expect(checkSameOrigin(wrong, undefined)).toBe(false);
  });

  const post = (origin: string) => makeRequest("/api/auth/login", { method: "POST", headers: { origin } });

  it("một origin trong danh sách: Origin phải bằng nó, kể cả khi nextUrl.origin là địa chỉ nội bộ", () => {
    expect(checkSameOrigin(post(PUBLIC_ORIGIN), [PUBLIC_ORIGIN])).toBe(true);
  });

  it("một origin: origin nội bộ (nextUrl.origin) và origin lạ bị từ chối", () => {
    for (const origin of [APP_ORIGIN, "https://evil.test", "null"]) {
      expect(checkSameOrigin(post(origin), [PUBLIC_ORIGIN]), origin).toBe(false);
    }
  });

  describe("nhiều origin (dev: localhost và IP LAN)", () => {
    const LOCAL = "http://localhost:3000";
    const LAN = "http://192.168.30.44:3000";
    const allowed = [LOCAL, LAN];

    it("cả hai origin khai báo được phép", () => {
      expect(checkSameOrigin(post(LOCAL), allowed)).toBe(true);
      expect(checkSameOrigin(post(LAN), allowed)).toBe(true);
    });

    it("origin thứ ba, 'null' và nextUrl.origin (không khai báo) bị từ chối", () => {
      for (const origin of ["http://192.168.30.45:3000", "https://evil.test", "null", APP_ORIGIN]) {
        expect(checkSameOrigin(post(origin), allowed), origin).toBe(false);
      }
    });

    it("không so khớp tiền tố và không nhận hậu tố lạ", () => {
      const lookalikes = [
        "http://192.168.30.4",
        "http://192.168.30.4:3000",
        "http://192.168.30.44",
        "http://192.168.30.44:30000",
        "http://localhost:3000.evil.com",
        "http://localhost",
        "http://localhost:3000/",
        "HTTP://LOCALHOST:3000",
      ];

      for (const origin of lookalikes) {
        expect(checkSameOrigin(post(origin), allowed), origin).toBe(false);
      }
    });

    it("thiếu Origin: luật cũ (GET/HEAD qua, ghi cần Sec-Fetch-Site: same-origin)", () => {
      const same = makeRequest("/api/auth/login", { method: "POST", headers: { "sec-fetch-site": "same-origin" } });
      const cross = makeRequest("/api/auth/login", { method: "POST", headers: { "sec-fetch-site": "cross-site" } });
      const none = makeRequest("/api/auth/login", { method: "POST" });

      expect(checkSameOrigin(same, allowed)).toBe(true);
      expect(checkSameOrigin(cross, allowed)).toBe(false);
      expect(checkSameOrigin(none, allowed)).toBe(false);
      expect(checkSameOrigin(makeRequest("/api/bff/users/me"), allowed)).toBe(true);
      expect(checkSameOrigin(makeRequest("/api/bff/users/me", { method: "HEAD" }), allowed)).toBe(true);
    });
  });
});

describe("errorEnvelope", () => {
  it("trả envelope lỗi cùng dạng BE, no-store", async () => {
    const nowMs = Date.parse("2026-10-14T08:00:00.000Z");
    const response = errorEnvelope(403, "Bff.CrossOrigin", nowMs);

    expect(response.status).toBe(403);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("content-type")).toContain("application/json");
    expect(await response.json()).toEqual({
      status: "error",
      data: null,
      message: null,
      errorCode: "Bff.CrossOrigin",
      timestamp: "2026-10-14T08:00:00.000Z",
    });
  });
});

describe("successEnvelope", () => {
  it("trả envelope thành công, mặc định 200, no-store", async () => {
    const nowMs = Date.parse("2026-10-14T08:00:00.000Z");
    const response = successEnvelope({ refreshed: false }, nowMs);

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual({
      status: "success",
      data: { refreshed: false },
      message: null,
      errorCode: null,
      timestamp: "2026-10-14T08:00:00.000Z",
    });
  });

  it("nhận init (status) và vẫn giữ no-store", async () => {
    const response = successEnvelope(null, 0, { status: 201 });

    expect(response.status).toBe(201);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect((await response.json()).data).toBeNull();
  });

  it("init.headers không làm mất no-store", () => {
    const response = successEnvelope(null, 0, { headers: { "x-test": "1" } });

    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("x-test")).toBe("1");
  });
});
