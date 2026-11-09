// Ghép chuỗi tiếng Việt cho tab Tổng quan (D-131..D-135, D-140). Hàm thuần: domain chỉ trả số, copy nằm ở tầng UI.
import { buildDayRange, countVisibleWaypoints, OVERVIEW_TAB, type DaySummary, type EditorTab, type Itinerary } from "@tripory/itinerary";
import { defaultCoverFor } from "./destination-cover";
import { formatKm, formatStartDate } from "./format";

/** Giá trị `value` của Base UI Tabs cho một `EditorTab`. */
export const tabValue = (tab: EditorTab): string => String(tab);

/** Ngược lại với `tabValue`; giá trị lạ rơi về Tổng quan. */
export function parseTabValue(value: string | number | null): EditorTab {
  const day = Number(value);
  if (value === OVERVIEW_TAB || !Number.isInteger(day) || day < 1) return OVERVIEW_TAB;
  return day;
}

const subtitleOf = (day: DaySummary): string | null => {
  const subtitle = day.subtitle?.trim() ?? "";
  if (subtitle === "") return null;
  return subtitle;
};

const pointsLabel = (count: number): string => `${count} điểm`;

/** "Ngày 2 · Phố cổ Hội An" hoặc "Ngày 2". */
export function dayRowTitle(day: DaySummary): string {
  const subtitle = subtitleOf(day);
  if (subtitle === null) return `Ngày ${day.dayNumber}`;
  return `Ngày ${day.dayNumber} · ${subtitle}`;
}

/** "3 điểm · 12,4 km", "3 điểm" (km 0 hoặc không có) hoặc "Chưa có điểm". */
export function dayRowMeta(day: DaySummary): string {
  if (day.waypointCount === 0) return "Chưa có điểm";
  const km = formatKm(day.distanceKm);
  if (km === null) return pointsLabel(day.waypointCount);
  return `${pointsLabel(day.waypointCount)} · ${km}`;
}

/** "Xem Ngày 2: Phố cổ Hội An, 3 điểm, 12,4 km"; bỏ phần nào không có dữ liệu. */
export function dayRowAccessibleName(day: DaySummary): string {
  const subtitle = subtitleOf(day);
  const head = subtitle === null ? `Xem Ngày ${day.dayNumber}` : `Xem Ngày ${day.dayNumber}: ${subtitle}`;
  if (day.waypointCount === 0) return `${head}, chưa có điểm`;
  const km = formatKm(day.distanceKm);
  const parts = [pointsLabel(day.waypointCount), km].filter((part): part is string => part !== null);
  return `${head}, ${parts.join(", ")}`;
}

/** "Tổng quan, 42,5 km" hoặc "Tổng quan". */
export function overviewTabAccessibleName(totalKm: number | null): string {
  const km = formatKm(totalKm);
  if (km === null) return "Tổng quan";
  return `Tổng quan, ${km}`;
}

/** "3 ngày · 5 điểm · 42,5 km", "3 ngày · 5 điểm" hoặc "3 ngày · Chưa có điểm". */
export function overviewMetaLine(dayCount: number, waypointCount: number, totalKm: number | null): string {
  const days = `${dayCount} ngày`;
  if (waypointCount === 0) return `${days} · Chưa có điểm`;
  const km = formatKm(totalKm);
  if (km === null) return `${days} · ${pointsLabel(waypointCount)}`;
  return `${days} · ${pointsLabel(waypointCount)} · ${km}`;
}

/** Chỉ các trường Tổng quan cần; cố ý không có điểm đến, sở thích (D-76) hay ngày kết thúc. */
export type OverviewSummaryData = Readonly<{
  title: string;
  description: string | null;
  startDateLabel: string | null;
  isPublic: boolean;
  coverImageUrl: string | null;
  fallbackCoverUrl: string | null;
  metaLine: string;
}>;

export function overviewSummaryData(itinerary: Itinerary, pendingIds: ReadonlySet<string>): OverviewSummaryData {
  return {
    title: itinerary.title,
    description: itinerary.description,
    startDateLabel: formatStartDate(itinerary.startDate),
    isPublic: itinerary.isPublic,
    coverImageUrl: itinerary.coverImageUrl,
    fallbackCoverUrl: defaultCoverFor(itinerary.destinationCode),
    metaLine: overviewMetaLine(
      buildDayRange(itinerary).length,
      countVisibleWaypoints(itinerary, pendingIds),
      itinerary.totalDistanceKm,
    ),
  };
}
