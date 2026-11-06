"use client";

// Thiết lập sau khi bản đồ `load`: tắt xoay (hai ngón vẫn zoom), gắn mô tả cho canvas, báo mức thu nhỏ tối đa vừa khung
// Việt Nam (mỗi lần đổi kích thước), và Esc trên canvas thì bỏ chọn (UI-SPEC §Khung nhìn và zoom).
// Mức thu nhỏ tối đa đi qua prop `minZoom` của `Map` (react-map-gl không cho gọi `setMinZoom` trực tiếp).
import { VIETNAM_VIEW_BOUNDS } from "@tripory/itinerary";
import { useEffect, useRef, type RefObject } from "react";
import type { MapRef } from "react-map-gl/maplibre";
import { toMapBounds } from "./map-camera";

export type MapCanvasOptions = Readonly<{
  ready: boolean;
  describedById: string;
  onEscape(): void;
  onMinZoomChange(zoom: number): void;
}>;

export function useMapCanvas(mapRef: RefObject<MapRef | null>, { ready, describedById, onEscape, onMinZoomChange }: MapCanvasOptions): void {
  const handlers = useRef({ onEscape, onMinZoomChange });
  useEffect(() => {
    handlers.current = { onEscape, onMinZoomChange };
  });

  useEffect(() => {
    const map = mapRef.current;
    if (!ready || map === null) return undefined;
    map.touchZoomRotate.disableRotation();
    map.keyboard.disableRotation();
    const canvas = map.getCanvas();
    canvas.setAttribute("aria-describedby", describedById);

    const reportMinZoom = () => {
      const fit = map.cameraForBounds(toMapBounds(VIETNAM_VIEW_BOUNDS));
      if (fit?.zoom !== undefined) handlers.current.onMinZoomChange(fit.zoom);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") handlers.current.onEscape();
    };
    reportMinZoom();
    map.on("resize", reportMinZoom);
    canvas.addEventListener("keydown", handleKeyDown);
    return () => {
      map.off("resize", reportMinZoom);
      canvas.removeEventListener("keydown", handleKeyDown);
    };
  }, [describedById, mapRef, ready]);
}
