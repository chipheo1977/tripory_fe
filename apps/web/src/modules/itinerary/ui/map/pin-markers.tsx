"use client";

// Pin là marker HTML chứa `MapPin` của ui-web (class token, vùng chạm 48px). Chỉ có chuột/chạm; bàn phím dùng danh sách (D-128).
import type { MapPinModel } from "@tripory/itinerary";
import { MapPin } from "@tripory/ui-web";
import { Marker } from "react-map-gl/maplibre";

/** `labelDetail` ("Ngày N" ở Tổng quan) do nơi gọi ghép, để bản đồ không biết khái niệm tab. */
export type TripMapPin = MapPinModel & Readonly<{ labelDetail?: string }>;

export type PinMarkersProps = Readonly<{
  pins: readonly TripMapPin[];
  onPinSelect(waypointId: string): void;
}>;

export function PinMarkers({ pins, onPinSelect }: PinMarkersProps) {
  return pins.map((pin) => {
    const dimmed = pin.state === "dimmed";
    return (
      <Marker
        anchor="center"
        key={pin.waypointId}
        latitude={pin.coordinate[1]}
        longitude={pin.coordinate[0]}
        onClick={(event) => {
          // Không để click nổi lên bản đồ, nếu không `onClick` của bản đồ (bỏ chọn) chạy ngay sau.
          event.originalEvent.stopPropagation();
          if (!dimmed) onPinSelect(pin.waypointId);
        }}
        style={{ zIndex: pin.stackOrder, pointerEvents: dimmed ? "none" : undefined }}
      >
        <MapPin label={{ title: pin.name, detail: pin.labelDetail }} number={pin.position} state={pin.state} tone={pin.colorIndex} />
      </Marker>
    );
  });
}
