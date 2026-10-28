// Dữ liệu thật của BE (tripory_be, đọc ngày 2026-10-24) dùng làm fixture test của package này.
// Nguồn: 04-RESEARCH.md §Contract BE (`ItinerariesController.cs`, `ToDetailDto`, `PagedResult`). Hình dạng cố ý
// "bẩn" như BE thật: ngày thưa (có Ngày 1 và 3, thiếu Ngày 2), `orderIndex` không theo thứ tự mảng,
// `subtitle: ""`, `updatedAt` có 7 chữ số lẻ giây và offset. Dữ liệu là mẫu: GUID bịa, địa điểm công khai.
// Không import `vitest`, không export ra barrel nào.
// Test ở `apps/web` có bản riêng (`src/test/be-itinerary-fixtures.ts`) vì không import xuyên package bằng đường tương đối.

const TIMESTAMP = '2026-10-24T08:08:08+00:00';

export const itineraryIdFixture = '3f2a6c1e-8b7d-4e21-9c55-0a1b2c3d4e5f';
export const ownerIdFixture = '3f2504e0-4f89-11d3-9a0c-0305e82c3301';
export const waypointIdsFixture = [
  'a1111111-1111-4111-8111-111111111111',
  'a2222222-2222-4222-8222-222222222222',
  'a3333333-3333-4333-8333-333333333333',
] as const;

/** `data` của `GET /itineraries/{id}`: Ngày 3 đứng trước Ngày 1, điểm Ngày 1 có `orderIndex` 1 rồi 0. */
export const itineraryDetailJsonFixture = {
  id: itineraryIdFixture,
  userId: ownerIdFixture,
  title: 'Sài Gòn 3 ngày',
  description: null,
  coverImageUrl: null,
  startDate: '2026-10-12',
  isPublic: false,
  totalDistanceKm: 12.4,
  createdAt: '2026-10-12T01:02:03.1234567+00:00',
  updatedAt: '2026-10-24T08:08:08.8812345+00:00',
  days: [
    { id: 'd3333333-3333-4333-8333-333333333333', dayNumber: 3, subtitle: null, dayDistanceKm: null },
    { id: 'd1111111-1111-4111-8111-111111111111', dayNumber: 1, subtitle: '', dayDistanceKm: 12.4 },
  ],
  waypoints: [
    {
      id: waypointIdsFixture[0],
      dayNumber: 1,
      orderIndex: 1,
      name: 'Bưu điện Thành phố',
      address: '2 Công xã Paris, Bến Nghé, Quận 1',
      longitude: 106.7001,
      latitude: 10.7799,
      notes: null,
    },
    {
      id: waypointIdsFixture[1],
      dayNumber: 1,
      orderIndex: 0,
      name: 'Chợ Bến Thành',
      address: 'Lê Lợi, Bến Thành, Quận 1',
      longitude: 106.7009,
      latitude: 10.7725,
      notes: 'Đi sớm cho đỡ đông',
    },
    {
      id: waypointIdsFixture[2],
      dayNumber: 3,
      orderIndex: 0,
      name: 'Dinh Độc Lập',
      address: null,
      longitude: 106.6953,
      latitude: 10.7769,
      notes: null,
    },
  ],
};

/** Một dòng của `GET /itineraries/mine`: không có `updatedAt`; hai bộ đếm của BE luôn 0 nên FE bỏ qua. */
export const itinerarySummaryJsonFixture = {
  id: itineraryIdFixture,
  userId: ownerIdFixture,
  title: 'Sài Gòn 3 ngày',
  description: null,
  coverImageUrl: null,
  startDate: '2026-10-12',
  isPublic: false,
  totalDistanceKm: 12.4,
  createdAt: '2026-10-12T01:02:03.1234567+00:00',
  daysCount: 0,
  waypointsCount: 0,
};

/** `data` của `GET /itineraries/mine`: `PagedResult` với trang kế. */
export const summaryPageJsonFixture = {
  items: [itinerarySummaryJsonFixture],
  pageIndex: 1,
  pageSize: 12,
  totalCount: 13,
  totalPages: 2,
  hasNextPage: true,
  hasPreviousPage: false,
};

/** `data` của `POST /itineraries/{id}/waypoints`: một `WaypointDto` (200, không phải 201). */
export const waypointJsonFixture = {
  id: waypointIdsFixture[2],
  dayNumber: 3,
  orderIndex: 1,
  name: 'Nhà thờ Đức Bà',
  address: null,
  longitude: 106.699,
  latitude: 10.7798,
  notes: null,
};

/** Envelope lỗi của BE, cùng hình với Phase 3. */
export const errorEnvelope = (errorCode: string, message: string) =>
  ({ status: 'error', data: null, message, errorCode, timestamp: TIMESTAMP }) as const;

/** 403 khi không phải chủ của lịch trình nháp. */
export const forbiddenEnvelope = errorEnvelope('Itinerary.Forbidden', 'Bạn không có quyền với lịch trình này.');

/** 400 khi tập id sắp lại lệch số lượng hoặc id. */
export const invalidReorderListEnvelope = errorEnvelope(
  'Itinerary.InvalidReorderList',
  'Danh sách sắp xếp không hợp lệ.',
);

/** 400 khi xuất bản lịch trình chưa có điểm đến nào. */
export const cannotPublishEmptyEnvelope = errorEnvelope(
  'Itinerary.CannotPublishEmpty',
  'Không thể xuất bản lịch trình chưa có điểm đến.',
);
