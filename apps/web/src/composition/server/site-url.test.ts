// @vitest-environment node
import { describe, expect, it } from "vitest";
import { DEFAULT_PUBLIC_SITE_URL, parsePublicSiteUrl } from "./site-url";

describe("parsePublicSiteUrl", () => {
  it("uses the default when the variable is missing, empty or blank", () => {
    expect(DEFAULT_PUBLIC_SITE_URL).toBe("https://triporyv1.vercel.app");
    expect(parsePublicSiteUrl({})).toBe("https://triporyv1.vercel.app");
    expect(parsePublicSiteUrl({ PUBLIC_SITE_URL: "" })).toBe("https://triporyv1.vercel.app");
    expect(parsePublicSiteUrl({ PUBLIC_SITE_URL: "   " })).toBe("https://triporyv1.vercel.app");
  });

  it("returns the origin and strips a trailing slash", () => {
    expect(parsePublicSiteUrl({ PUBLIC_SITE_URL: "https://tripory.example.com" })).toBe("https://tripory.example.com");
    expect(parsePublicSiteUrl({ PUBLIC_SITE_URL: "https://tripory.example.com/" })).toBe("https://tripory.example.com");
  });

  it.each(["https://a.com/x", "https://a.com/?q=1", "https://a.com/#h", "https://user:pw@a.com"])(
    "rejects %s without echoing the value",
    (value) => {
      expect(() => parsePublicSiteUrl({ PUBLIC_SITE_URL: value })).toThrow("PUBLIC_SITE_URL không hợp lệ");
      try {
        parsePublicSiteUrl({ PUBLIC_SITE_URL: value });
      } catch (error) {
        expect((error as Error).message).not.toContain(value);
      }
    },
  );

  it.each(["ftp://a.com", "javascript:alert(1)", "không phải url"])("rejects the protocol or text %s", (value) => {
    expect(() => parsePublicSiteUrl({ PUBLIC_SITE_URL: value })).toThrow("PUBLIC_SITE_URL không hợp lệ");
  });

  it("requires https in production except for loopback hosts", () => {
    expect(() => parsePublicSiteUrl({ PUBLIC_SITE_URL: "http://example.com", NODE_ENV: "production" })).toThrow(
      "PUBLIC_SITE_URL không hợp lệ",
    );
    expect(parsePublicSiteUrl({ PUBLIC_SITE_URL: "http://localhost:3000", NODE_ENV: "production" })).toBe(
      "http://localhost:3000",
    );
  });

  it("allows plain http outside production", () => {
    expect(parsePublicSiteUrl({ PUBLIC_SITE_URL: "http://192.168.30.44:3000", NODE_ENV: "development" })).toBe(
      "http://192.168.30.44:3000",
    );
  });
});
