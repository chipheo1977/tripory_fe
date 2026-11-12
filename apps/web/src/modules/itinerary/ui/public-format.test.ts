import { parseCalendarDate } from "@tripory/itinerary";
import { describe, expect, it } from "vitest";
import {
  articleMetaLine,
  dayAnchorId,
  daySectionMeta,
  daySectionTitle,
  googleMapsUrl,
  mapsLinkLabel,
} from "./public-format";

const DATE = parseCalendarDate("2026-10-12");

describe("articleMetaLine", () => {
  it("joins start date, days, points and km", () => {
    expect(articleMetaLine({ startDate: DATE, dayCount: 3, waypointCount: 12, totalDistanceKm: 45.2 })).toBe(
      "Khởi hành 12/10/2026 · 3 ngày · 12 điểm · 45,2 km",
    );
  });

  it("drops the start date when it is missing", () => {
    expect(articleMetaLine({ startDate: null, dayCount: 3, waypointCount: 12, totalDistanceKm: 45.2 })).toBe(
      "3 ngày · 12 điểm · 45,2 km",
    );
  });

  it.each([0, null])("drops the distance when it is %s", (km) => {
    expect(articleMetaLine({ startDate: null, dayCount: 3, waypointCount: 12, totalDistanceKm: km })).toBe(
      "3 ngày · 12 điểm",
    );
  });

  it("says Chưa có điểm when there are no waypoints", () => {
    expect(articleMetaLine({ startDate: null, dayCount: 3, waypointCount: 0, totalDistanceKm: 5 })).toBe(
      "3 ngày · Chưa có điểm",
    );
    expect(articleMetaLine({ startDate: DATE, dayCount: 3, waypointCount: 0, totalDistanceKm: null })).toBe(
      "Khởi hành 12/10/2026 · 3 ngày · Chưa có điểm",
    );
  });

  it("keeps the plural-free wording for a single day", () => {
    expect(articleMetaLine({ startDate: null, dayCount: 1, waypointCount: 2, totalDistanceKm: null })).toBe(
      "1 ngày · 2 điểm",
    );
  });
});

describe("daySectionTitle", () => {
  it("appends the subtitle", () => {
    expect(daySectionTitle({ dayNumber: 2, subtitle: "Phố cổ Hội An" })).toBe("Ngày 2 · Phố cổ Hội An");
  });

  it.each([null, "", "   "])("is just the day when the subtitle is %j", (subtitle) => {
    expect(daySectionTitle({ dayNumber: 2, subtitle })).toBe("Ngày 2");
  });
});

describe("daySectionMeta", () => {
  it("shows points and km", () => {
    expect(daySectionMeta(3, 12.4)).toBe("3 điểm · 12,4 km");
  });

  it.each([0, null])("hides the km when it is %s", (km) => {
    expect(daySectionMeta(3, km)).toBe("3 điểm");
  });

  it("is null for an empty day", () => {
    expect(daySectionMeta(0, 5)).toBeNull();
  });
});

describe("googleMapsUrl, mapsLinkLabel, dayAnchorId", () => {
  it("builds the maps search url from the coordinate", () => {
    expect(googleMapsUrl(10.7725, 106.7009)).toBe(
      "https://www.google.com/maps/search/?api=1&query=10.7725,106.7009",
    );
  });

  it("keeps the sign of negative coordinates", () => {
    expect(googleMapsUrl(-33.86, 151.21)).toBe("https://www.google.com/maps/search/?api=1&query=-33.86,151.21");
  });

  it("names the waypoint in the accessible label", () => {
    expect(mapsLinkLabel("Chợ Bến Thành")).toBe("Mở Chợ Bến Thành trong Google Maps (mở tab mới)");
  });

  it("derives the anchor id from the day number", () => {
    expect(dayAnchorId(3)).toBe("ngay-3");
  });
});
