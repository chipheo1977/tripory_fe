// Phép biến đổi thuần cho bản đồ trong editor và tab Tổng quan (PUB-06). Chỉ trả số, trạng thái và
// tọa độ: chuỗi hiển thị tiếng Việt thuộc tầng UI. Dùng lại được ở trang công khai (D-129).
import { boundsOf, isDegenerate, VIETNAM_VIEW_BOUNDS } from './geo-bounds';
import type { GeoBounds, LngLat } from './geo-bounds';
import { buildDayRange } from './day-range';
import type { Itinerary, Waypoint } from './itinerary';

export const OVERVIEW_TAB = 'overview' as const;

/** Tab đang chọn của editor: Tổng quan hoặc dayNumber (1-based). */
export type EditorTab = typeof OVERVIEW_TAB | number;

/** Số màu trong bảng màu theo day; sang day thứ 9 màu lặp lại (D-123). */
export const DAY_COLOR_COUNT = 8;

/** day 1..8 -> 1..8, day 9 -> 1, day 17 -> 1. */
export const dayColorIndex = (dayNumber: number): number => ((dayNumber - 1) % DAY_COLOR_COUNT) + 1;

export type MapEmphasis = Readonly<{
  tab: EditorTab;
  /** Day đang rê chuột/focus ở tab Tổng quan; `null` khi không có (D-122). */
  hoveredDay: number | null;
  selectedWaypointId: string | null;
}>;

export type MapPinState = 'normal' | 'selected' | 'dimmed';

export type MapPinModel = Readonly<{
  waypointId: string;
  name: string;
  dayNumber: number;
  /** Số thứ tự 1-based trong day, tính trên các waypoint còn hiển thị. */
  position: number;
  colorIndex: number;
  coordinate: LngLat;
  state: MapPinState;
  /** 1..n, số lớn nằm trên: mờ < thường < đang chọn. */
  stackOrder: number;
}>;

export type DayRouteModel = Readonly<{
  dayNumber: number;
  colorIndex: number;
  coordinates: readonly LngLat[];
  dimmed: boolean;
  /** 0 = mờ, 1 = thường, 2 = đang được nhấn mạnh. Số lớn vẽ sau. */
  sortKey: number;
}>;

export type MapFitTarget = Readonly<{ kind: 'bounds'; bounds: GeoBounds } | { kind: 'point'; center: LngLat }>;

export type DaySummary = Readonly<{
  dayNumber: number;
  subtitle: string | null;
  waypointCount: number;
  distanceKm: number | null;
}>;

const toLngLat = (waypoint: Waypoint): LngLat => [waypoint.coordinate.longitude, waypoint.coordinate.latitude];

// Không tin thứ tự đầu vào: sắp theo (dayNumber, orderIndex) và bỏ waypoint đang chờ xóa.
function visibleWaypoints(itinerary: Itinerary, pendingIds: ReadonlySet<string>): readonly Waypoint[] {
  return itinerary.waypoints
    .filter((waypoint) => !pendingIds.has(waypoint.id))
    .toSorted((a, b) => a.dayNumber - b.dayNumber || a.orderIndex - b.orderIndex);
}

const waypointsInDay = (waypoints: readonly Waypoint[], dayNumber: number): readonly Waypoint[] =>
  waypoints.filter((waypoint) => waypoint.dayNumber === dayNumber);

export function countVisibleWaypoints(itinerary: Itinerary, pendingIds: ReadonlySet<string>): number {
  return visibleWaypoints(itinerary, pendingIds).length;
}

/** Tổng quan khi đã có waypoint, day 1 khi rỗng (D-132). */
export function defaultEditorTab(itinerary: Itinerary, pendingIds: ReadonlySet<string>): EditorTab {
  if (countVisibleWaypoints(itinerary, pendingIds) > 0) return OVERVIEW_TAB;
  return 1;
}

function isDayActive(emphasis: MapEmphasis, dayNumber: number): boolean {
  if (emphasis.tab !== OVERVIEW_TAB) return emphasis.tab === dayNumber;
  if (emphasis.hoveredDay === null) return true;
  return emphasis.hoveredDay === dayNumber;
}

function isDayFocused(emphasis: MapEmphasis, dayNumber: number): boolean {
  if (emphasis.tab !== OVERVIEW_TAB) return emphasis.tab === dayNumber;
  return emphasis.hoveredDay === dayNumber;
}

function pinStateOf(waypoint: Waypoint, emphasis: MapEmphasis): MapPinState {
  if (waypoint.id === emphasis.selectedWaypointId) return 'selected';
  if (isDayActive(emphasis, waypoint.dayNumber)) return 'normal';
  return 'dimmed';
}

const STATE_RANK: Readonly<Record<MapPinState, number>> = { dimmed: 0, normal: 1, selected: 2 };

export function buildMapPins(
  itinerary: Itinerary,
  pendingIds: ReadonlySet<string>,
  emphasis: MapEmphasis,
): readonly MapPinModel[] {
  const visible = visibleWaypoints(itinerary, pendingIds);
  const positions = new Map<string, number>();
  const counters = new Map<number, number>();
  for (const waypoint of visible) {
    const next = (counters.get(waypoint.dayNumber) ?? 0) + 1;
    counters.set(waypoint.dayNumber, next);
    positions.set(waypoint.id, next);
  }

  const pins = visible.map((waypoint) => ({
    waypointId: waypoint.id,
    name: waypoint.name,
    dayNumber: waypoint.dayNumber,
    position: positions.get(waypoint.id) ?? 1,
    colorIndex: dayColorIndex(waypoint.dayNumber),
    coordinate: toLngLat(waypoint),
    state: pinStateOf(waypoint, emphasis),
  }));

  const stacked = pins.toSorted(
    (a, b) => STATE_RANK[a.state] - STATE_RANK[b.state] || a.dayNumber - b.dayNumber || a.position - b.position,
  );
  const stackOrders = new Map(stacked.map((pin, index) => [pin.waypointId, index + 1]));

  return pins.map((pin) => ({ ...pin, stackOrder: stackOrders.get(pin.waypointId) ?? 1 }));
}

function routeSortKey(emphasis: MapEmphasis, dayNumber: number): number {
  if (!isDayActive(emphasis, dayNumber)) return 0;
  if (isDayFocused(emphasis, dayNumber)) return 2;
  return 1;
}

/** Một đường cho mỗi day có từ 2 waypoint hiển thị; không bao giờ nối qua day khác (D-124). */
export function buildDayRoutes(
  itinerary: Itinerary,
  pendingIds: ReadonlySet<string>,
  emphasis: MapEmphasis,
): readonly DayRouteModel[] {
  const visible = visibleWaypoints(itinerary, pendingIds);
  const dayNumbers = [...new Set(visible.map((waypoint) => waypoint.dayNumber))];

  return dayNumbers.flatMap((dayNumber) => {
    const points = waypointsInDay(visible, dayNumber);
    if (points.length < 2) return [];
    return [
      {
        dayNumber,
        colorIndex: dayColorIndex(dayNumber),
        coordinates: points.map(toLngLat),
        dimmed: !isDayActive(emphasis, dayNumber),
        sortKey: routeSortKey(emphasis, dayNumber),
      },
    ];
  });
}

function fitPoints(visible: readonly Waypoint[], tab: EditorTab): readonly Waypoint[] {
  if (tab === OVERVIEW_TAB) return visible;
  const ofDay = waypointsInDay(visible, tab);
  if (ofDay.length === 0) return visible;
  return ofDay;
}

/** Khung cần canh theo tab (D-121, D-127). Không có waypoint: khung tỉnh, rồi khung Việt Nam. */
export function fitTargetFor(
  itinerary: Itinerary,
  pendingIds: ReadonlySet<string>,
  tab: EditorTab,
  fallbackBounds: GeoBounds | null,
): MapFitTarget {
  const points = fitPoints(visibleWaypoints(itinerary, pendingIds), tab).map(toLngLat);
  const bounds = boundsOf(points) ?? fallbackBounds ?? VIETNAM_VIEW_BOUNDS;
  if (points.length > 0 && isDegenerate(bounds)) return { kind: 'point', center: bounds[0] };
  return { kind: 'bounds', bounds };
}

/** Đủ dải day 1..max (kể cả day thưa) với số waypoint còn hiển thị (D-28, D-135). */
export function summarizeDays(itinerary: Itinerary, pendingIds: ReadonlySet<string>): readonly DaySummary[] {
  return buildDayRange(itinerary).map((day) => ({
    dayNumber: day.dayNumber,
    subtitle: day.subtitle,
    waypointCount: day.waypoints.filter((waypoint) => !pendingIds.has(waypoint.id)).length,
    distanceKm: day.distanceKm,
  }));
}
