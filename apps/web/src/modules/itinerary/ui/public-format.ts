// Chuỗi và URL của chế độ Bài viết trên trang công khai (D-01, D-03, D-04). Hàm thuần: copy nằm ở tầng UI, domain chỉ
// trả số. Không `new Date()`: ngày dựng từ chuỗi `YYYY-MM-DD` (D-26).
import { buildDayRange, type CalendarDate, type Itinerary } from "@tripory/itinerary";
import { defaultCoverFor } from "./destination-cover";
import { formatKm, formatStartDate } from "./format";
import { overviewMetaLine } from "./overview-format";

export type ArticleMetaInput = Readonly<{
  startDate: CalendarDate | null;
  dayCount: number;
  waypointCount: number;
  totalDistanceKm: number | null;
}>;

/** "Khởi hành 12/10/2026 · 3 ngày · 12 điểm · 45,2 km"; bỏ phần nào không có dữ liệu. */
export function articleMetaLine(input: ArticleMetaInput): string {
  return [formatStartDate(input.startDate), overviewMetaLine(input.dayCount, input.waypointCount, input.totalDistanceKm)]
    .filter((part): part is string => part !== null)
    .join(" · ");
}

/** "Ngày 2 · Phố cổ Hội An" hoặc "Ngày 2". */
export function daySectionTitle(day: Readonly<{ dayNumber: number; subtitle: string | null }>): string {
  const subtitle = day.subtitle?.trim() ?? "";
  if (subtitle === "") return `Ngày ${day.dayNumber}`;
  return `Ngày ${day.dayNumber} · ${subtitle}`;
}

/** "3 điểm · 12,4 km", "3 điểm", hoặc `null` cho ngày trống (ngày trống dùng câu "Chưa có điểm" riêng). */
export function daySectionMeta(waypointCount: number, distanceKm: number | null): string | null {
  if (waypointCount === 0) return null;
  const points = `${waypointCount} điểm`;
  const km = formatKm(distanceKm);
  if (km === null) return points;
  return `${points} · ${km}`;
}

/** Link mở Google Maps tại tọa độ (D-03). Tọa độ là số đã qua `Wgs84Coordinate`, không có ký tự lạ. */
export const googleMapsUrl = (latitude: number, longitude: number): string =>
  `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;

export const mapsLinkLabel = (name: string): string => `Mở ${name} trong Google Maps (mở tab mới)`;

/** `id` của mục ngày, đích cuộn của dải chip (D-06). */
export const dayAnchorId = (dayNumber: number): string => `ngay-${dayNumber}`;

/** Chỉ các trường Tổng quan chỉ đọc cần; cố ý không có điểm đến, sở thích (D-76), ngày kết thúc hay trạng thái xuất bản. */
export type PublicOverviewData = Readonly<{
  title: string;
  description: string | null;
  startDateLabel: string | null;
  coverImageUrl: string | null;
  fallbackCoverUrl: string | null;
  metaLine: string;
}>;

export function publicOverviewData(itinerary: Itinerary): PublicOverviewData {
  return {
    title: itinerary.title,
    description: itinerary.description,
    startDateLabel: formatStartDate(itinerary.startDate),
    coverImageUrl: itinerary.coverImageUrl,
    fallbackCoverUrl: defaultCoverFor(itinerary.destinationCode),
    metaLine: overviewMetaLine(buildDayRange(itinerary).length, itinerary.waypoints.length, itinerary.totalDistanceKm),
  };
}
