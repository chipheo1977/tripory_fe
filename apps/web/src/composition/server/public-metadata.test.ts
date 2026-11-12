// @vitest-environment node
import type { Itinerary } from "@tripory/itinerary";
import { describe, expect, it } from "vitest";
import { makeFxItinerary, makeFxWaypoint } from "@/test/domain-itinerary-fixtures";
import { buildPublicMetadata, chooseOgImage, neutralPublicMetadata, ogDescription } from "./public-metadata";
import type { PublicItineraryResult } from "./public-itinerary";

const SITE = "https://site.test";
const DEST_BASE = "https://triporyv1.vercel.app/destinations";
const ID = "3f2a6c1e-8b7d-4e21-9c55-0a1b2c3d4e5f";
const DEFAULT_IMAGE = { url: "https://site.test/og-default.png", width: 1200, height: 630, alt: "Tripory" };

const itinerary = (overrides: Partial<Itinerary> = {}) => makeFxItinerary(overrides);
const ok = (overrides: Partial<Itinerary> = {}): PublicItineraryResult => ({ kind: "ok", itinerary: itinerary(overrides) });
const build = (result: PublicItineraryResult) =>
  buildPublicMetadata({ result, id: ID, siteUrl: SITE, destinationImageBaseUrl: DEST_BASE });

describe("ogDescription", () => {
  it("collapses whitespace and trims", () => {
    expect(ogDescription(itinerary({ description: "  Hai   ngày\n ở  Hội An  " }))).toBe("Hai ngày ở Hội An");
  });

  it("truncates long text to at most 160 characters plus an ellipsis, at a word boundary", () => {
    const words = Array.from({ length: 60 }, () => "abcd").join(" ");
    const result = ogDescription(itinerary({ description: words }));

    expect(result.length).toBeLessThanOrEqual(161);
    expect(result.endsWith("…")).toBe(true);
    expect(result.slice(0, -1).endsWith(" ")).toBe(false);
    expect(words.startsWith(result.slice(0, -1))).toBe(true);
  });

  it("hard-cuts a long text without spaces", () => {
    const result = ogDescription(itinerary({ description: "x".repeat(300) }));

    expect(result).toBe(`${"x".repeat(160)}…`);
  });

  it("keeps text of exactly 160 characters untouched", () => {
    expect(ogDescription(itinerary({ description: "y".repeat(160) }))).toBe("y".repeat(160));
  });

  it.each([null, "", "   \n "])("falls back to the counts when the description is %j", (description) => {
    const value = itinerary({ description });

    expect(ogDescription(value)).toBe("Lịch trình 3 ngày · 3 điểm trên Tripory");
  });

  it("keeps the template for zero waypoints", () => {
    expect(ogDescription(itinerary({ description: null, waypoints: [], days: [] }))).toBe(
      "Lịch trình 1 ngày · 0 điểm trên Tripory",
    );
  });

  it("counts every waypoint across days", () => {
    const waypoints = [makeFxWaypoint("a", 1, 0), makeFxWaypoint("b", 2, 0), makeFxWaypoint("c", 2, 1), makeFxWaypoint("d", 5, 0), makeFxWaypoint("e", 5, 1)];

    expect(ogDescription(itinerary({ description: null, waypoints }))).toBe("Lịch trình 5 ngày · 5 điểm trên Tripory");
  });
});

describe("chooseOgImage", () => {
  it("uses the user's own https cover as is", () => {
    expect(chooseOgImage("https://cdn.example.com/a.jpg", SITE, DEST_BASE)).toEqual({
      url: "https://cdn.example.com/a.jpg",
      alt: "Tripory",
    });
  });

  it("treats a destination placeholder as no cover", () => {
    expect(chooseOgImage(`${DEST_BASE}/hoi-an.jpg`, SITE, DEST_BASE)).toEqual(DEFAULT_IMAGE);
  });

  it.each(["http://cdn.example.com/a.jpg", null, "javascript:alert(1)"])("falls back for %j", (cover) => {
    expect(chooseOgImage(cover, SITE, DEST_BASE)).toEqual(DEFAULT_IMAGE);
  });

  it("is not fooled by a lookalike host", () => {
    const lookalike = "https://triporyv1.vercel.app.evil.test/destinations/x.jpg";

    expect(chooseOgImage(lookalike, SITE, DEST_BASE).url).toBe(lookalike);
  });
});

describe("buildPublicMetadata for an ok result", () => {
  it("builds the title, description, robots and base", () => {
    const metadata = build(ok({ title: "Hội An 3 ngày", description: "Phố cổ" }));

    expect(metadata.title).toBe("Hội An 3 ngày");
    expect(metadata.description).toBe("Phố cổ");
    expect(metadata.robots).toEqual({ index: false, follow: false });
    expect((metadata.metadataBase as URL).href).toBe("https://site.test/");
  });

  it("builds Open Graph without the view param", () => {
    const og = build(ok({ title: "Hội An 3 ngày" })).openGraph as Record<string, unknown>;

    expect(og.url).toBe(`https://site.test/itineraries/${ID}`);
    expect(String(og.url)).not.toContain("?");
    expect(og.type).toBe("website");
    expect(og.siteName).toBe("Tripory");
    expect(og.locale).toBe("vi_VN");
    expect(og.title).toBe("Hội An 3 ngày");
    expect(og.images).toHaveLength(1);
  });

  it("uses the default image and the same url for twitter", () => {
    const metadata = build(ok());
    const twitter = metadata.twitter as Record<string, unknown>;

    expect(twitter.card).toBe("summary_large_image");
    expect(twitter.images).toEqual(["https://site.test/og-default.png"]);
    expect((metadata.openGraph as { images: unknown[] }).images[0]).toEqual(DEFAULT_IMAGE);
  });

  it("uses the user's cover for og and twitter", () => {
    const metadata = build(ok({ coverImageUrl: "https://cdn.example.com/a.jpg" }));

    expect((metadata.twitter as { images: string[] }).images).toEqual(["https://cdn.example.com/a.jpg"]);
  });
});

describe("neutral metadata", () => {
  const SECRET_TITLE = "Chuyến bí mật của tôi";

  it.each(["forbidden", "not-found", "recover", "error"] as const)("is neutral and noindex for %s", (kind) => {
    const metadata = build({ kind });

    expect(metadata.title).toBe("Lịch trình");
    expect(metadata.robots).toEqual({ index: false, follow: false });
    expect(metadata).not.toHaveProperty("openGraph");
    expect(metadata).not.toHaveProperty("twitter");
    expect(metadata).not.toHaveProperty("description");
    expect(JSON.stringify(metadata)).not.toContain(SECRET_TITLE);
  });

  it("does not leak a draft title anywhere when the result is not ok", () => {
    const metadata = buildPublicMetadata({
      result: { kind: "forbidden" },
      id: ID,
      siteUrl: SITE,
      destinationImageBaseUrl: DEST_BASE,
    });

    expect(JSON.stringify(metadata)).not.toContain(SECRET_TITLE);
  });

  it("neutralPublicMetadata matches the non-ok shape (malformed id)", () => {
    expect(neutralPublicMetadata(SITE)).toEqual(build({ kind: "not-found" }));
  });
});

describe("noindex everywhere", () => {
  it.each([{ kind: "forbidden" }, { kind: "not-found" }, { kind: "recover" }, { kind: "error" }, ok()] as const)(
    "robots is noindex,nofollow for %j",
    (result) => {
      const robots = build(result as PublicItineraryResult).robots as { index: boolean; follow: boolean };

      expect(robots.index).toBe(false);
      expect(robots.follow).toBe(false);
    },
  );
});
