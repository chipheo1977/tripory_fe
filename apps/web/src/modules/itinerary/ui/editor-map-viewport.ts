// Khung nhìn của bản đồ trong editor (UI-SPEC §Đồng bộ chọn và canh khung, vùng an toàn). Hàm thuần: nhận kích thước
// đã đo, trả `MapViewport` cho `TripMap`. Dưới `lg` sheet phủ một phần đáy bản đồ nên vùng an toàn chừa phần bị che.
import { snapHeightPx } from "@tripory/ui-web";
import { DESKTOP_INSETS, type MapViewport } from "./map/map-camera";

export type SheetSnapName = "peek" | "medium" | "expanded";

/** Khung một slot bản đồ nhận từ `EditorLayout`: bố cục rộng hay hẹp và vùng an toàn tương ứng. */
export type MapFrame = Readonly<{ wide: boolean; viewport: MapViewport }>;

/** Yêu cầu đưa sheet về một mức (bấm pin: D-125). `seq` tăng mỗi lần để cùng một mức vẫn áp lại được. */
export type SheetSnapRequest = Readonly<{ seq: number; snap: SheetSnapName }>;

/** Vùng chip "Lịch trình" khi sheet đóng: chip cao 44px + 16px đệm + 16px dự phòng. */
export const REOPEN_CHIP_AREA_PX = 76;

const NARROW_TOP_PX = 64;
const NARROW_SIDE_PX = 32;
const NARROW_BOTTOM_EXTRA_PX = 32;

export const wideViewport = (): MapViewport => ({ padding: DESKTOP_INSETS, coveredBottom: 0 });

export type NarrowViewportInput = Readonly<{
  open: boolean;
  snap: SheetSnapName;
  viewportHeight: number;
  headerHeight: number;
}>;

function coveredHeight({ open, snap, viewportHeight, headerHeight }: NarrowViewportInput): number {
  if (!open) return REOPEN_CHIP_AREA_PX;
  return snapHeightPx(viewportHeight, headerHeight, snap);
}

/**
 * Phần đáy popup của sheet đang nằm dưới mép màn hình ở mức hiện tại: popup luôn cao bằng mức expanded và bị dịch xuống
 * `expanded − mức hiện tại`. Phần tử `sticky bottom-0` của timeline nằm ở đáy popup nên bị che từng đó; dùng số này làm
 * `bottom` để thanh dính nằm đúng mép dưới nhìn thấy.
 */
export function sheetHiddenBottomPx(input: NarrowViewportInput): number {
  if (!input.open) return 0;
  const { viewportHeight, headerHeight, snap } = input;
  const expanded = snapHeightPx(viewportHeight, headerHeight, "expanded");
  return Math.max(expanded - snapHeightPx(viewportHeight, headerHeight, snap), 0);
}

export function narrowViewport(input: NarrowViewportInput): MapViewport {
  const mapHeight = Math.max(input.viewportHeight - input.headerHeight, 0);
  const coveredBottom = Math.min(coveredHeight(input), mapHeight);
  return {
    padding: {
      top: NARROW_TOP_PX,
      right: NARROW_SIDE_PX,
      bottom: coveredBottom + NARROW_BOTTOM_EXTRA_PX,
      left: NARROW_SIDE_PX,
    },
    coveredBottom,
  };
}
