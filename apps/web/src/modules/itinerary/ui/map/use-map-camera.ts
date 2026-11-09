"use client";

// Chạy lệnh camera (`fit`/`focus`/`reveal`) đúng một lần cho mỗi `seq`; lệnh tới trước khi bản đồ `load` được giữ lại và
// chạy ngay sau `load`. Hàm tính tham số là hàm thuần ở `map-camera.ts`.
import { useEffect, useRef, type RefObject } from "react";
import type { MapRef } from "react-map-gl/maplibre";
import {
  cameraCallFor,
  isInsideSafeArea,
  prefersReducedMotion,
  toMapBounds,
  toMapPoint,
  type MapCameraCommand,
  type MapInsets,
} from "./map-camera";

function isRevealed(map: MapRef, command: MapCameraCommand, padding: MapInsets): boolean {
  if (command.kind !== "reveal") return false;
  const canvas = map.getCanvas();
  return isInsideSafeArea(map.project(toMapPoint(command.center)), { width: canvas.clientWidth, height: canvas.clientHeight }, padding);
}

function runCamera(map: MapRef, command: MapCameraCommand, padding: MapInsets): void {
  if (isRevealed(map, command, padding)) return;
  const call = cameraCallFor(command, padding, prefersReducedMotion());
  if (call.method === "fitBounds") {
    map.fitBounds(toMapBounds(call.bounds), call.options);
    return;
  }
  map.easeTo({ ...call.options, center: toMapPoint(call.options.center) });
}

export function useMapCamera(
  mapRef: RefObject<MapRef | null>,
  camera: MapCameraCommand | null,
  ready: boolean,
  padding: MapInsets,
): void {
  const lastSeq = useRef<number | null>(null);
  useEffect(() => {
    const map = mapRef.current;
    if (camera === null || !ready || map === null) return;
    if (lastSeq.current === camera.seq) return;
    lastSeq.current = camera.seq;
    runCamera(map, camera, padding);
  }, [camera, mapRef, padding, ready]);
}
