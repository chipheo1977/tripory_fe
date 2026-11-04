// Type aggregate của context itinerary. Thuần dữ liệu: không DTO, không React, không đồng hồ,
// để dùng được cả trên React Native. Dữ liệu vào đây đã qua ACL (mapper ở infrastructure).
import type { ItineraryId, UserId, Wgs84Coordinate } from '@tripory/shared-kernel';
import type { CalendarDate } from './calendar-date';
import type { InterestCode } from './interests';

export type StatusFilter = 'all' | 'draft' | 'published';

export const STATUS_FILTERS: readonly StatusFilter[] = ['all', 'draft', 'published'];

// Giá trị lạ (gõ tay trên URL, bản cũ) rơi về 'all' thay vì lỗi: bộ lọc chỉ là gợi ý hiển thị (D-03).
export const parseStatusFilter = (raw: string | null | undefined): StatusFilter => {
  if (raw === 'draft' || raw === 'published') return raw;
  return 'all';
};

export type Waypoint = Readonly<{
  id: string;
  dayNumber: number;
  orderIndex: number;
  name: string;
  address: string | null;
  notes: string | null;
  coordinate: Wgs84Coordinate;
}>;

export type ItineraryDay = Readonly<{
  dayNumber: number;
  subtitle: string | null;
  distanceKm: number | null;
}>;

export type Itinerary = Readonly<{
  id: ItineraryId;
  ownerId: UserId;
  title: string;
  description: string | null;
  /** Ảnh đang hiển thị (D-99); là một phần tử của `coverImages` khi danh sách không rỗng. */
  coverImageUrl: string | null;
  /** Danh sách ảnh bìa (tối đa 5), theo thứ tự lưu; có thể rỗng. */
  coverImages: readonly string[];
  /** Mã điểm đến (slug); `null` với lịch trình cũ. Có thể là mã FE chưa biết. */
  destinationCode: string | null;
  interests: readonly InterestCode[];
  startDate: CalendarDate | null;
  isPublic: boolean;
  totalDistanceKm: number;
  days: readonly ItineraryDay[];
  waypoints: readonly Waypoint[];
}>;

export type ItinerarySummary = Readonly<{
  id: ItineraryId;
  title: string;
  /** Ảnh đang hiển thị (D-99). */
  coverImageUrl: string | null;
  destinationCode: string | null;
  startDate: CalendarDate | null;
  isPublic: boolean;
  totalDistanceKm: number;
}>;

export type Page<T> = Readonly<{
  items: readonly T[];
  pageIndex: number;
  hasNextPage: boolean;
}>;

// Một ngày để vẽ tab: có thể là ngày "thưa" không có bản ghi day lẫn waypoint (xem `buildDayRange`).
export type DayView = Readonly<{
  dayNumber: number;
  subtitle: string | null;
  distanceKm: number | null;
  waypoints: readonly Waypoint[];
}>;
