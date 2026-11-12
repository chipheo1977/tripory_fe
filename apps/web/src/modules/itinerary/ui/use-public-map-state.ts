"use client";

// Trạng thái chọn/camera/tab của chế độ Bản đồ chỉ đọc (D-10). Lấy nguyên logic của `LoadedEditor` (Phase 4: D-125..D-127,
// D-131..D-136) nhưng bỏ phần ghi: không xóa chờ hoàn tác (`pendingIds` luôn rỗng), không form, không bản nháp, không lưu.
// Tab mặc định là Tổng quan và không lưu trên URL (chỉ `?view` lưu). Kiểu trả về nhiều trường là chấp nhận ở hook trạng thái
// của container; các component con nhận props hẹp.
import {
  buildDayRange,
  buildDayRoutes,
  buildMapPins,
  countVisibleWaypoints,
  fitTargetFor,
  OVERVIEW_TAB,
  summarizeDays,
  type DayRouteModel,
  type DaySummary,
  type DayView,
  type EditorTab,
  type Itinerary,
  type Waypoint,
} from "@tripory/itinerary";
import { useMemo, useState } from "react";
import type { DayRowEmphasis } from "./day-overview-row";
import { destinationBoundsFor } from "./destination-cover";
import { toLngLat, toTripMapPins } from "./editor-map-pins";
import type { SheetSnapRequest } from "./editor-map-viewport";
import type { MapCameraCommand } from "./map/map-camera";
import type { MapStatus, TripMapPin } from "./map/trip-map";
import { useEditorTab } from "./use-editor-tab";
import { useMapCamera } from "./use-map-camera";
import { useMapSelection } from "./use-map-selection";

/** Bản công khai không có lệnh xóa chờ hoàn tác. */
const EMPTY_PENDING: ReadonlySet<string> = new Set();
const noop = (): void => undefined;

export type PublicMapState = Readonly<{
  tab: EditorTab;
  dayView: DayView;
  days: readonly DaySummary[];
  dayNumbers: readonly number[];
  pins: readonly TripMapPin[];
  routes: readonly DayRouteModel[];
  empty: boolean;
  camera: MapCameraCommand;
  selectedId: string | null;
  mapStatus: MapStatus;
  setMapStatus(status: MapStatus): void;
  sheetRequest: SheetSnapRequest | null;
  tabFocus: Readonly<{ tab: EditorTab; seq: number }> | null;
  changeTab(tab: EditorTab): void;
  selectDayFromRow(dayNumber: number): void;
  handlePinSelect(waypointId: string): void;
  handleActivate(waypoint: Waypoint): void;
  clearSelection(): void;
  rowEmphasis(dayNumber: number): DayRowEmphasis;
  emphasizeDay(day: number | null): void;
}>;

function clampTab(tab: EditorTab, lastDay: number): EditorTab {
  if (tab === OVERVIEW_TAB) return tab;
  return Math.min(tab, lastDay);
}

/** Ngày của thân tab ngày; ở Tổng quan thân đó không hiện nên dùng ngày cuối cho đủ kiểu. */
function dayOfTab(tab: EditorTab, lastDay: number): number {
  if (tab === OVERVIEW_TAB) return lastDay;
  return tab;
}

/** Điểm đang chọn chỉ còn hiệu lực khi vẫn có trong lịch trình. */
function visibleSelection(selectedId: string | null, itinerary: Itinerary): string | null {
  if (selectedId === null) return null;
  if (!itinerary.waypoints.some((candidate) => candidate.id === selectedId)) return null;
  return selectedId;
}

export function usePublicMapState({ itinerary, wide }: Readonly<{ itinerary: Itinerary; wide: boolean }>): PublicMapState {
  const { tab, selectTab } = useEditorTab(OVERVIEW_TAB);
  const destinationBounds = useMemo(() => destinationBoundsFor(itinerary.destinationCode), [itinerary.destinationCode]);
  const selection = useMapSelection();
  const camera = useMapCamera(() => fitTargetFor(itinerary, EMPTY_PENDING, OVERVIEW_TAB, destinationBounds));
  const [mapStatus, setMapStatus] = useState<MapStatus>("loading");
  const [sheetRequest, setSheetRequest] = useState<SheetSnapRequest | null>(null);
  const [tabFocus, setTabFocus] = useState<PublicMapState["tabFocus"]>(null);

  const dayRange = useMemo(() => buildDayRange(itinerary), [itinerary]);
  const dayNumbers = useMemo(() => dayRange.map((day) => day.dayNumber), [dayRange]);
  const lastDay = dayRange.at(-1)?.dayNumber ?? 1;
  const activeTab = clampTab(tab, lastDay);
  // `dayRange` luôn có ít nhất Ngày 1; ngày đã kẹp vào dải nên luôn tìm thấy.
  const dayView = dayRange.find((candidate) => candidate.dayNumber === dayOfTab(activeTab, lastDay)) ?? dayRange[0]!;

  const selectedId = visibleSelection(selection.selectedWaypointId, itinerary);
  const emphasis = { tab: activeTab, hoveredDay: wide ? selection.hoveredDay : null, selectedWaypointId: selectedId };
  const pins = toTripMapPins(buildMapPins(itinerary, EMPTY_PENDING, emphasis), activeTab);
  const routes = buildDayRoutes(itinerary, EMPTY_PENDING, emphasis);
  const empty = countVisibleWaypoints(itinerary, EMPTY_PENDING) === 0;
  const selectedDayNumber = itinerary.waypoints.find((candidate) => candidate.id === selectedId)?.dayNumber ?? null;

  // Đổi tab: bỏ chọn điểm và canh khung theo tab mới (D-127).
  const changeTab = (next: EditorTab): void => {
    selection.clear();
    selectTab(next);
    camera.fit(fitTargetFor(itinerary, EMPTY_PENDING, next, destinationBounds));
  };

  // Bấm dòng ngày ở Tổng quan: sang tab Ngày N và focus vào tab đó (D-135).
  const selectDayFromRow = (dayNumber: number): void => {
    changeTab(dayNumber);
    setTabFocus((previous) => ({ tab: dayNumber, seq: (previous?.seq ?? 0) + 1 }));
  };

  // Bấm pin: chọn điểm, dời bản đồ nếu pin/nhãn ra ngoài vùng an toàn, đưa sheet về mức vừa (D-125, D-136).
  const handlePinSelect = (waypointId: string): void => {
    const target = itinerary.waypoints.find((candidate) => candidate.id === waypointId);
    if (target === undefined) return;
    selection.select(waypointId);
    camera.reveal(toLngLat(target.coordinate));
    setSheetRequest((previous) => ({ seq: (previous?.seq ?? 0) + 1, snap: "medium" }));
  };

  // Bấm nút điểm trong danh sách: luôn chọn; chỉ dời bản đồ tới pin (giữ zoom) khi bản đồ đã sẵn sàng (D-126).
  const handleActivate = (target: Waypoint): void => {
    selection.select(target.id);
    if (mapStatus === "ready") camera.focus(toLngLat(target.coordinate));
  };

  const rowEmphasis = (dayNumber: number): DayRowEmphasis => {
    if (dayNumber === selectedDayNumber) return "selected";
    return "none";
  };

  return {
    tab: activeTab,
    dayView,
    days: summarizeDays(itinerary, EMPTY_PENDING),
    dayNumbers,
    pins,
    routes,
    empty,
    camera: camera.command,
    selectedId,
    mapStatus,
    setMapStatus,
    sheetRequest,
    tabFocus,
    changeTab,
    selectDayFromRow,
    handlePinSelect,
    handleActivate,
    clearSelection: selection.clear,
    rowEmphasis,
    emphasizeDay: wide ? selection.hoverDay : noop,
  };
}
