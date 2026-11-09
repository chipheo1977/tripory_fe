import { createWgs84Coordinate, parseItineraryId, parseUserId } from "@tripory/shared-kernel";
import type { DaySummary, Itinerary } from "@tripory/itinerary";
import { describe, expect, it } from "vitest";
import {
  dayRowAccessibleName,
  dayRowMeta,
  dayRowTitle,
  overviewMetaLine,
  overviewSummaryData,
  overviewTabAccessibleName,
  parseTabValue,
  tabValue,
} from "./overview-format";

const day = (overrides: Partial<DaySummary> = {}): DaySummary => ({
  dayNumber: 2,
  subtitle: "Phố cổ Hội An",
  waypointCount: 3,
  distanceKm: 12.4,
  ...overrides,
});

describe("dayRowTitle", () => {
  it.each([
    ["Phố cổ Hội An", "Ngày 2 · Phố cổ Hội An"],
    [null, "Ngày 2"],
    ["", "Ngày 2"],
    ["   ", "Ngày 2"],
  ])("phụ đề %j -> %s", (subtitle, expected) => {
    expect(dayRowTitle(day({ subtitle }))).toBe(expected);
  });
});

describe("dayRowMeta", () => {
  it.each([
    [day(), "3 điểm · 12,4 km"],
    [day({ distanceKm: null }), "3 điểm"],
    [day({ distanceKm: 0 }), "3 điểm"],
    [day({ waypointCount: 0 }), "Chưa có điểm"],
    [day({ waypointCount: 0, distanceKm: 5 }), "Chưa có điểm"],
  ])("%j -> %s", (input, expected) => {
    expect(dayRowMeta(input)).toBe(expected);
  });
});

describe("dayRowAccessibleName", () => {
  it.each([
    [day(), "Xem Ngày 2: Phố cổ Hội An, 3 điểm, 12,4 km"],
    [day({ subtitle: null }), "Xem Ngày 2, 3 điểm, 12,4 km"],
    [day({ distanceKm: null }), "Xem Ngày 2: Phố cổ Hội An, 3 điểm"],
    [day({ subtitle: null, distanceKm: null }), "Xem Ngày 2, 3 điểm"],
    [day({ subtitle: null, waypointCount: 0 }), "Xem Ngày 2, chưa có điểm"],
    [day({ waypointCount: 0 }), "Xem Ngày 2: Phố cổ Hội An, chưa có điểm"],
  ])("%j -> %s", (input, expected) => {
    expect(dayRowAccessibleName(input)).toBe(expected);
  });
});

describe("overviewTabAccessibleName", () => {
  it.each([
    [42.5, "Tổng quan, 42,5 km"],
    [0, "Tổng quan"],
    [null, "Tổng quan"],
  ])("%s -> %s", (km, expected) => {
    expect(overviewTabAccessibleName(km)).toBe(expected);
  });
});

describe("overviewMetaLine", () => {
  it.each([
    [3, 5, 42.5, "3 ngày · 5 điểm · 42,5 km"],
    [3, 5, 0, "3 ngày · 5 điểm"],
    [3, 5, null, "3 ngày · 5 điểm"],
    [3, 0, 0, "3 ngày · Chưa có điểm"],
    [1, 0, 42.5, "1 ngày · Chưa có điểm"],
  ])("(%i, %i, %s) -> %s", (days, points, km, expected) => {
    expect(overviewMetaLine(days, points, km)).toBe(expected);
  });
});

describe("tabValue và parseTabValue", () => {
  it.each([
    ["overview", "overview"],
    [3, "3"],
  ] as const)("tabValue(%s) = %s", (tab, value) => {
    expect(tabValue(tab)).toBe(value);
    expect(parseTabValue(value)).toBe(tab);
  });

  it.each(["", "abc", "0", "-1", "1.5", null])("giá trị lạ %j rơi về Tổng quan", (value) => {
    expect(parseTabValue(value)).toBe("overview");
  });
});

describe("overviewSummaryData", () => {
  const id = parseItineraryId("3f2a6c1e-8b7d-4e21-9c55-0a1b2c3d4e5f");
  const owner = parseUserId("3f2504e0-4f89-11d3-9a0c-0305e82c3301");
  const coordinate = createWgs84Coordinate({ latitude: 16, longitude: 108 });
  if (id === null || owner === null || coordinate === null) throw new Error("dữ liệu mẫu phải hợp lệ");
  const waypoint = (wid: string, dayNumber: number) => ({
    id: wid,
    dayNumber,
    orderIndex: 0,
    name: wid,
    address: null,
    notes: null,
    coordinate,
  });
  const itinerary: Itinerary = {
    id,
    ownerId: owner,
    title: "Đà Nẵng 3 ngày",
    description: "Mô tả",
    coverImageUrl: "https://example.test/a.jpg",
    coverImages: ["https://example.test/a.jpg"],
    destinationCode: "vn-da-nang",
    interests: [],
    startDate: "2026-11-05" as Itinerary["startDate"],
    isPublic: true,
    totalDistanceKm: 42.5,
    days: [{ dayNumber: 3, subtitle: null, distanceKm: null }],
    waypoints: [waypoint("a", 1), waypoint("b", 1), waypoint("c", 2)],
  };

  it("ghép thông tin chung, đếm theo dải ngày và bỏ điểm chờ xóa", () => {
    const data = overviewSummaryData(itinerary, new Set(["b"]));

    expect(data).toMatchObject({
      title: "Đà Nẵng 3 ngày",
      description: "Mô tả",
      isPublic: true,
      coverImageUrl: "https://example.test/a.jpg",
      metaLine: "3 ngày · 2 điểm · 42,5 km",
    });
    expect(data.startDateLabel).toMatch(/^Khởi hành 05\/11\/2026$/u);
  });

  it("không có ngày khởi hành thì startDateLabel là null; không lộ điểm đến hay sở thích", () => {
    const data = overviewSummaryData({ ...itinerary, startDate: null, interests: ["food"] as never }, new Set());

    expect(data.startDateLabel).toBeNull();
    expect(Object.keys(data).sort()).toEqual(
      ["coverImageUrl", "description", "fallbackCoverUrl", "isPublic", "metaLine", "startDateLabel", "title"].sort(),
    );
  });

  it("có ảnh mặc định của điểm đến làm dự phòng", () => {
    expect(overviewSummaryData(itinerary, new Set()).fallbackCoverUrl).toMatch(/^https:\/\//u);
    expect(overviewSummaryData({ ...itinerary, destinationCode: null }, new Set()).fallbackCoverUrl).toBeNull();
  });
});
