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
