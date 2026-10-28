// Fixture JSON itinerary của BE dùng chung cho test app (plan 04-05, dùng lại ở các plan UI/route sau).
// Nguồn: `tripory_be` nhánh `feat/be-fe-integration-group-a`, đọc 2026-10-24 (04-RESEARCH.md §Contract BE).
// Không phụ thuộc thư viện test nên dùng được ở mọi môi trường. Dữ liệu là mẫu: GUID bịa, tên địa điểm công khai, không token/email thật (T-04-10).
//
// Hình dạng cố ý "bẩn" như BE thật: ngày thưa (có Ngày 1 và 3, thiếu 2), `orderIndex` không theo thứ tự
// mảng, `subtitle: ""`, `updatedAt` có 7 chữ số lẻ giây và offset.

export const ITINERARY_ID = "3f2a6c1e-8b7d-4e21-9c55-0a1b2c3d4e5f";
export const OWNER_ID = "3f2504e0-4f89-11d3-9a0c-0305e82c3301";
export const OTHER_USER_ID = "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d";
export const WAYPOINT_IDS = [
  "a1111111-1111-4111-8111-111111111111",
  "a2222222-2222-4222-8222-222222222222",
  "a3333333-3333-4333-8333-333333333333",
] as const;

const TIMESTAMP = "2026-10-24T08:08:08+00:00";

export type ItineraryDayJson = {
  id: string;
  dayNumber: number;
  subtitle: string | null;
  dayDistanceKm: number | null;
};

export type ItineraryWaypointJson = {
  id: string;
  dayNumber: number;
  orderIndex: number;
  name: string;
  address: string | null;
  longitude: number;
  latitude: number;
  notes: string | null;
};

export type ItineraryDetailJson = {
  id: string;
  userId: string;
  title: string;
  description: string | null;
  coverImageUrl: string | null;
  startDate: string | null;
  isPublic: boolean;
  totalDistanceKm: number;
  createdAt: string;
  updatedAt: string;
  days: ItineraryDayJson[];
  waypoints: ItineraryWaypointJson[];
};

export type ItinerarySummaryJson = {
  id: string;
  userId: string;
  title: string;
  description: string | null;
  coverImageUrl: string | null;
  startDate: string | null;
  isPublic: boolean;
  totalDistanceKm: number;
  createdAt: string;
  daysCount: number;
  waypointsCount: number;
};

export type SummaryPageJson = {
  items: ItinerarySummaryJson[];
  pageIndex: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
};

/** Chi tiết itinerary: Ngày 3 đứng trước Ngày 1 (thiếu Ngày 2), điểm Ngày 1 có orderIndex 1 rồi 0. */
export function itineraryDetailJson(overrides: Partial<ItineraryDetailJson> = {}): ItineraryDetailJson {
  return {
    id: ITINERARY_ID,
    userId: OWNER_ID,
    title: "Sài Gòn 3 ngày",
    description: null,
    coverImageUrl: null,
    startDate: "2026-10-12",
    isPublic: false,
    totalDistanceKm: 12.4,
    createdAt: "2026-10-12T01:02:03.1234567+00:00",
    updatedAt: "2026-10-24T08:08:08.8812345+00:00",
    days: [
      { id: "d3333333-3333-4333-8333-333333333333", dayNumber: 3, subtitle: null, dayDistanceKm: null },
      { id: "d1111111-1111-4111-8111-111111111111", dayNumber: 1, subtitle: "", dayDistanceKm: 12.4 },
    ],
    waypoints: [
      {
        id: WAYPOINT_IDS[0],
        dayNumber: 1,
        orderIndex: 1,
        name: "Bưu điện Thành phố",
        address: "2 Công xã Paris, Bến Nghé, Quận 1",
        longitude: 106.7001,
        latitude: 10.7799,
        notes: null,
      },
      {
        id: WAYPOINT_IDS[1],
        dayNumber: 1,
        orderIndex: 0,
        name: "Chợ Bến Thành",
        address: "Lê Lợi, Bến Thành, Quận 1",
        longitude: 106.7009,
        latitude: 10.7725,
        notes: "Đi sớm cho đỡ đông",
      },
      {
        id: WAYPOINT_IDS[2],
        dayNumber: 3,
        orderIndex: 0,
        name: "Dinh Độc Lập",
        address: null,
        longitude: 106.6953,
        latitude: 10.7769,
        notes: null,
      },
    ],
    ...overrides,
  };
}

/** Một dòng trong danh sách `/mine` (không có `updatedAt`, có `daysCount` và `waypointsCount`). */
export function summaryJson(overrides: Partial<ItinerarySummaryJson> = {}): ItinerarySummaryJson {
  return {
    id: ITINERARY_ID,
    userId: OWNER_ID,
    title: "Sài Gòn 3 ngày",
    description: null,
    coverImageUrl: null,
    startDate: "2026-10-12",
    isPublic: false,
    totalDistanceKm: 12.4,
    createdAt: "2026-10-12T01:02:03.1234567+00:00",
    daysCount: 2,
    waypointsCount: 3,
    ...overrides,
  };
}

/** Một trang `PagedResult`; `totalCount` suy từ số item khi không có trang kế. */
export function summaryPageJson(
  options: { items?: ItinerarySummaryJson[]; pageIndex?: number; pageSize?: number; hasNextPage?: boolean } = {},
): SummaryPageJson {
  const items = options.items ?? [summaryJson()];
  const pageIndex = options.pageIndex ?? 1;
  const pageSize = options.pageSize ?? 12;
  const hasNextPage = options.hasNextPage ?? false;
  const totalPages = hasNextPage ? pageIndex + 1 : pageIndex;
  return {
    items,
    pageIndex,
    pageSize,
    totalCount: (pageIndex - 1) * pageSize + items.length + (hasNextPage ? 1 : 0),
    totalPages,
    hasNextPage,
    hasPreviousPage: pageIndex > 1,
  };
}

/** Envelope thành công cùng hình với `be-auth-fixtures.ts`. */
export const itineraryEnvelope = <T>(data: T) => ({
  status: "success" as const,
  data,
  message: null,
  errorCode: null,
  timestamp: TIMESTAMP,
});

