// Hằng và phép tính camera thuần của bản đồ (D-117, D-127). Không import thư viện bản đồ: chỉ kiểu từ domain,
// để test không cần WebGL. Các hàm đọc `window` (media query) gói riêng để test thay thế.
import type { GeoBounds, LngLat, MapFitTarget } from "@tripory/itinerary";

export const MAP_MOVE_MS = 480;
export const MAP_LOAD_TIMEOUT_MS = 15_000;
export const MAP_MAX_ZOOM = 18;
export const FIT_MAX_ZOOM = 15;
export const SINGLE_POINT_ZOOM = 14;

/** Vùng chừa thêm phía trên cho nhãn pin: pin 36px + 8px + nhãn khoảng 40px. */
export const LABEL_ALLOWANCE_PX = 84;

export type MapInsets = Readonly<{ top: number; right: number; bottom: number; left: number }>;

export const DESKTOP_INSETS: MapInsets = { top: 64, right: 64, bottom: 64, left: 64 };

/** `padding` là vùng an toàn khi canh khung; `coveredBottom` là số px đáy bản đồ bị sheet che (desktop là 0). */
export type MapViewport = Readonly<{ padding: MapInsets; coveredBottom: number }>;

export const DESKTOP_VIEWPORT: MapViewport = { padding: DESKTOP_INSETS, coveredBottom: 0 };

export type MapCameraCommand = Readonly<
  | { seq: number; kind: "fit"; target: MapFitTarget }
  /** Di chuyển tới điểm, giữ zoom (thêm/sửa điểm, bấm thẻ điểm: D-126, D-127). */
  | { seq: number; kind: "focus"; center: LngLat }
  /** Chỉ dời khi pin và nhãn nằm ngoài vùng an toàn (bấm pin: D-125, D-136). */
  | { seq: number; kind: "reveal"; center: LngLat }
>;

export type CameraCall =
  | { method: "fitBounds"; bounds: GeoBounds; options: { padding: MapInsets; maxZoom: number; duration: number } }
  | { method: "easeTo"; options: { center: LngLat; zoom?: number; padding: MapInsets; duration: number } };

/** Điểm (px trong khung bản đồ) có nằm trong vùng an toàn, đã chừa chỗ cho nhãn phía trên không. */
export function isInsideSafeArea(
  point: Readonly<{ x: number; y: number }>,
  size: Readonly<{ width: number; height: number }>,
  padding: MapInsets,
): boolean {
  const insideX = point.x >= padding.left && point.x <= size.width - padding.right;
  const insideY = point.y >= padding.top + LABEL_ALLOWANCE_PX && point.y <= size.height - padding.bottom;
  return insideX && insideY;
}

/** Đọc lúc thao tác, không cache lúc mount (UI-SPEC). Không có `matchMedia` thì coi như không giảm chuyển động. */
export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export const moveDuration = (reduced: boolean): number => (reduced ? 0 : MAP_MOVE_MS);

export function cameraCallFor(command: MapCameraCommand, insets: MapInsets, reduced: boolean): CameraCall {
  const duration = moveDuration(reduced);
  if (command.kind === "fit" && command.target.kind === "bounds") {
    return { method: "fitBounds", bounds: command.target.bounds, options: { padding: insets, maxZoom: FIT_MAX_ZOOM, duration } };
  }
  if (command.kind === "fit" && command.target.kind === "point") {
    return { method: "easeTo", options: { center: command.target.center, zoom: SINGLE_POINT_ZOOM, padding: insets, duration } };
  }
  return { method: "easeTo", options: { center: centerOf(command), padding: insets, duration } };
}

function centerOf(command: MapCameraCommand): LngLat {
  if (command.kind === "fit") return command.target.kind === "point" ? command.target.center : command.target.bounds[0];
  return command.center;
}

/** MapLibre nhận tuple có thể ghi; kiểu domain là `readonly`. */
export const toMapBounds = (bounds: GeoBounds): [[number, number], [number, number]] => [
  [bounds[0][0], bounds[0][1]],
  [bounds[1][0], bounds[1][1]],
];

export const toMapPoint = (point: LngLat): [number, number] => [point[0], point[1]];