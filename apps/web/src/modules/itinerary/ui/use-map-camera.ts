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

/**
 * `initial` chỉ được đọc một lần lúc mount (lệnh `fit` đầu tiên); đổi giá trị này sau đó không di chuyển camera.
 * Muốn đổi khung nhìn, gọi `fit`/`focus`/`reveal`. Truyền hàm để tránh tính toán lại ở mỗi lần render.
 */
export function useMapCamera(initial: MapFitTarget | (() => MapFitTarget)): EditorMapCamera {
  const [command, setCommand] = useState<MapCameraCommand>(() => ({
    seq: 1,
    kind: "fit",
    target: typeof initial === "function" ? initial() : initial,
  }));
  const fit = useCallback((target: MapFitTarget) => setCommand((prev) => ({ seq: prev.seq + 1, kind: "fit", target })), []);
  const focus = useCallback((center: LngLat) => setCommand((prev) => ({ seq: prev.seq + 1, kind: "focus", center })), []);
  const reveal = useCallback((center: LngLat) => setCommand((prev) => ({ seq: prev.seq + 1, kind: "reveal", center })), []);
  return { command, fit, focus, reveal };
}
