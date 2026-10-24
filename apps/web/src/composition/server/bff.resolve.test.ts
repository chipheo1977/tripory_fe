// @vitest-environment node
import { describe, expect, it } from "vitest";
import { BFF_ALLOWED_METHODS, BFF_ALLOWED_ROOTS, resolveBffTarget } from "./bff";

const ITINERARY_ID = "3f2a8c1e-4f89-11d3-9a0c-0305e82c3301";

describe("resolveBffTarget: đường dẫn hợp lệ", () => {
  it.each([
    [["users", "me"], "/api/bff/users/me", "/api/v1/users/me"],
    [["users"], "/api/bff/users", "/api/v1/users"],
    [["itineraries", ITINERARY_ID], `/api/bff/itineraries/${ITINERARY_ID}`, `/api/v1/itineraries/${ITINERARY_ID}`],
    [["chat", "conversations", "x"], "/api/bff/chat/conversations/x", "/api/v1/chat/conversations/x"],
    [["users", "a b"], "/api/bff/users/a%20b", "/api/v1/users/a%20b"],
  ] as const)("%j → cho qua, upstream %s", (segments, rawPathname, expected) => {
    expect(resolveBffTarget(segments, rawPathname)).toEqual({ ok: true, path: expected });
  });
});

describe("resolveBffTarget: gốc ngoài allowlist → 404", () => {
  it.each([
    [[], "/api/bff"],
    [["auth", "login"], "/api/bff/auth/login"],
    [["auth"], "/api/bff/auth"],
    [["Users", "me"], "/api/bff/Users/me"],
    [["admin"], "/api/bff/admin"],
    [["api", "v1", "users"], "/api/bff/api/v1/users"],
    [["usersx"], "/api/bff/usersx"],
  ] as const)("%j → 404", (segments, rawPathname) => {
    expect(resolveBffTarget(segments, rawPathname)).toEqual({ ok: false, status: 404 });
  });
});

describe("resolveBffTarget: path traversal → 400", () => {
  it.each([
    [["users", ""], "/api/bff/users/"],
    [["users", "."], "/api/bff/users/."],
    [["..", "auth", "login"], "/api/bff/../auth/login"],
    [["users", ".."], "/api/bff/users/.."],
    [["users", "a/b"], "/api/bff/users/a/b"],
    [["users", "a\\b"], "/api/bff/users/a\\b"],
    [["users", "a\u0000b"], "/api/bff/users/a"],
    [["users", "a\nb"], "/api/bff/users/a"],
    [["users", "../auth/login"], "/api/bff/users/x"],
  ] as const)("segments %j → 400", (segments, rawPathname) => {
    expect(resolveBffTarget(segments, rawPathname)).toEqual({ ok: false, status: 400 });
  });

  it.each([
    ["/api/bff/users/%2e%2e/auth/login"],
    ["/api/bff/users/%2E%2E/auth/login"],
    ["/api/bff/users/a%2fb"],
    ["/api/bff/users/a%2Fb"],
    ["/api/bff/users/a%5cb"],
    ["/api/bff/users/a%5Cb"],
  ] as const)("rawPathname %s → 400 kể cả khi segment đã giải mã trông sạch", (rawPathname) => {
    expect(resolveBffTarget(["users", "x"], rawPathname)).toEqual({ ok: false, status: 400 });
  });

  it("traversal được ưu tiên 400 trước khi xét gốc allowlist", () => {
    expect(resolveBffTarget(["auth", ".."], "/api/bff/auth/..")).toEqual({ ok: false, status: 400 });
    expect(resolveBffTarget(["auth", "login"], "/api/bff/auth/%2e%2e/login")).toEqual({ ok: false, status: 400 });
  });
});

describe("hằng allowlist", () => {
  it("chỉ cho users, itineraries, chat và 4 verb GET POST PUT DELETE", () => {
    expect([...BFF_ALLOWED_ROOTS].sort()).toEqual(["chat", "itineraries", "users"]);
    expect([...BFF_ALLOWED_METHODS].sort()).toEqual(["DELETE", "GET", "POST", "PUT"]);
  });
});
