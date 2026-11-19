import { describe, expect, it } from "vitest";
import { buildLoginHref } from "./login-href";

const PATH = "/itineraries/3f2a6c1e-8b7d-4e21-9c55-0a1b2c3d4e5f";

describe("buildLoginHref", () => {
  it("không có query", () => {
    expect(buildLoginHref(PATH, "")).toBe("/login?next=%2Fitineraries%2F3f2a6c1e-8b7d-4e21-9c55-0a1b2c3d4e5f");
  });

  it("giữ ?view", () => {
    expect(buildLoginHref(PATH, "view=map")).toBe(`/login?next=${encodeURIComponent(`${PATH}?view=map`)}`);
  });

  it("query có hoặc không có ? đầu cho cùng kết quả", () => {
    expect(buildLoginHref(PATH, "?view=map")).toBe(buildLoginHref(PATH, "view=map"));
  });

  it.each(["/login", "/register", ""])("pathname %j thì không có next", (pathname) => {
    expect(buildLoginHref(pathname, "")).toBe("/login");
  });

  it("đường dẫn ra ngoài site bị loại", () => {
    expect(buildLoginHref("//evil.com", "")).toBe("/login");
  });
});
