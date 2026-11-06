// Ghép pin của domain thành pin cho bản đồ (UI-SPEC §Nhãn tên cạnh pin). Hàm thuần.
import type { EditorTab, LngLat, MapPinModel } from "@tripory/itinerary";
import { OVERVIEW_TAB } from "@tripory/itinerary";
import type { Wgs84Coordinate } from "@tripory/shared-kernel";
import type { TripMapPin } from "./map/trip-map";

/** `[kinh độ, vĩ độ]` như GeoJSON/MapLibre. */
export const toLngLat = (coordinate: Wgs84Coordinate): LngLat => [coordinate.longitude, coordinate.latitude];

/** Ở Tổng quan nhãn pin có dòng thứ hai "Ngày N"; ở tab ngày chỉ có tên điểm. */
export function toTripMapPins(pins: readonly MapPinModel[], tab: EditorTab): readonly TripMapPin[] {
  if (tab !== OVERVIEW_TAB) return pins;
  return pins.map((pin) => ({ ...pin, labelDetail: `Ngày ${pin.dayNumber}` }));
}
