"use client";

// Lệnh camera của editor: mỗi lệnh có `seq` tăng dần để bản đồ thực hiện đúng một lần cho mỗi `seq`
// (cùng một tọa độ gọi hai lần vẫn là hai lệnh). Thực thi nằm ở `map/use-map-camera.ts`.
import type { LngLat, MapFitTarget } from "@tripory/itinerary";
import { useCallback, useState } from "react";
import type { MapCameraCommand } from "./map/map-camera";

export type EditorMapCamera = Readonly<{
  command: MapCameraCommand;
  fit(target: MapFitTarget): void;
  focus(center: LngLat): void;
  reveal(center: LngLat): void;
}>;

export function useMapCamera(initial: MapFitTarget): EditorMapCamera {
  const [command, setCommand] = useState<MapCameraCommand>({ seq: 1, kind: "fit", target: initial });
  const fit = useCallback((target: MapFitTarget) => setCommand((prev) => ({ seq: prev.seq + 1, kind: "fit", target })), []);
  const focus = useCallback((center: LngLat) => setCommand((prev) => ({ seq: prev.seq + 1, kind: "focus", center })), []);
  const reveal = useCallback((center: LngLat) => setCommand((prev) => ({ seq: prev.seq + 1, kind: "reveal", center })), []);
  return { command, fit, focus, reveal };
}
