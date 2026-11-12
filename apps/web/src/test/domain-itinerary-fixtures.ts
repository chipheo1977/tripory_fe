// Dữ liệu domain `Itinerary` dùng chung cho test UI của Phase 5 (05-08..05-18).
// Test dưới `modules/**` không được import `@tripory/itinerary/http` (ESLint `httpOnlyInComposition`) nên không dựng
// bằng `toItinerary(...)`; dựng thẳng object domain như `itinerary-editor.test.tsx`. Không import `vitest`.
import { createWgs84Coordinate, parseItineraryId, parseUserId } from "@tripory/shared-kernel";
import { parseCalendarDate } from "@tripory/itinerary";
import type { Itinerary, ItineraryAuthor, Waypoint } from "@tripory/itinerary";

export const FX_ITINERARY_ID = "3f2a6c1e-8b7d-4e21-9c55-0a1b2c3d4e5f";
export const FX_OWNER_ID = "3f2504e0-4f89-11d3-9a0c-0305e82c3301";
export const FX_OTHER_ID = "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d";

function required<T>(value: T | null, name: string): T {
  if (value === null) throw new Error(`Dữ liệu mẫu ${name} phải hợp lệ.`);
  return value;
}

export const fxItineraryId = () => required(parseItineraryId(FX_ITINERARY_ID), "itineraryId");
export const fxOwnerId = () => required(parseUserId(FX_OWNER_ID), "ownerId");
export const fxOtherId = () => required(parseUserId(FX_OTHER_ID), "otherId");

export function makeFxWaypoint(
  id: string,
  dayNumber: number,
  orderIndex: number,
  overrides: Partial<Waypoint> = {},
): Waypoint {
  const coordinate = required(
    createWgs84Coordinate({ latitude: 10.77 + orderIndex / 100, longitude: 106.69 + dayNumber / 100 }),
    "coordinate",
  );

  return {
    id,
    dayNumber,
    orderIndex,
    name: `Điểm ${id}`,
    address: null,
    notes: null,
    coordinate,
    ...overrides,
  };
}

/** Lịch trình ĐÃ XUẤT BẢN của chủ mẫu: Ngày 1 (2 điểm) và Ngày 3 (1 điểm), thiếu Ngày 2 (ngày thưa). Không có `author`. */
export function makeFxItinerary(overrides: Partial<Itinerary> = {}): Itinerary {
  return {
    id: fxItineraryId(),
    ownerId: fxOwnerId(),
    title: "Sài Gòn 3 ngày",
    description: "Ba ngày khám phá Sài Gòn",
    coverImageUrl: null,
    coverImages: [],
    destinationCode: null,
    interests: [],
    startDate: parseCalendarDate("2026-10-12"),
    isPublic: true,
    totalDistanceKm: 12.4,
    days: [
      { dayNumber: 1, subtitle: "Trung tâm", distanceKm: 12.4 },
      { dayNumber: 3, subtitle: null, distanceKm: null },
    ],
    waypoints: [makeFxWaypoint("w-1-0", 1, 0), makeFxWaypoint("w-1-1", 1, 1), makeFxWaypoint("w-3-0", 3, 0)],
    ...overrides,
  };
}

export const FX_AUTHOR: ItineraryAuthor = {
  id: fxOwnerId(),
  displayName: "Trần Thị Lan",
  avatarUrl: null,
};
