"use client";

// Bản đồ của editor (PUB-06; D-111..D-128). Nhận pin, đường và lệnh camera đã tính sẵn từ domain; không biết gì về
// tab hay form. Chỉ nạp phía client qua `trip-map.lazy.tsx`. Pin/đường là marker và GeoJSON cục bộ, không gửi dữ liệu
// lịch trình ra ngoài (D-115); request duy nhất là tile và glyph của OpenFreeMap.
import "maplibre-gl/dist/maplibre-gl.css";
import type { DayRouteModel } from "@tripory/itinerary";
import { VIETNAM_VIEW_BOUNDS } from "@tripory/itinerary";
import { MapZoomControls } from "@tripory/ui-web";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Map, type MapRef } from "react-map-gl/maplibre";
import { BASEMAP_STYLE } from "./basemap-style";
import { readDayColors, readDimmedOpacity } from "./day-colors";
import { MapAttribution } from "./map-attribution";
import {
  MAP_MAX_ZOOM,
  moveDuration,
  prefersReducedMotion,
  toMapBounds,
  type MapCameraCommand,
  type MapViewport,
} from "./map-camera";
import { PinMarkers, type TripMapPin } from "./pin-markers";
import { RouteLayer } from "./route-layer";
import { useMapCamera } from "./use-map-camera";
import { useMapCanvas } from "./use-map-canvas";

export type { TripMapPin };

export type MapStatus = "loading" | "ready" | "error";

export type TripMapProps = Readonly<{
  pins: readonly TripMapPin[];
  routes: readonly DayRouteModel[];
  camera: MapCameraCommand | null;
  viewport: MapViewport;
  onPinSelect(waypointId: string): void;
  onBackgroundClick(): void;
  onStatusChange(status: MapStatus): void;
}>;

// Mẫu docs MapLibre cho Next 15+ (Turbopack): đường dẫn tĩnh để bundler phát worker thành asset có hash.
const WORKER_URL = new URL("maplibre-gl/dist/maplibre-gl-worker.mjs", import.meta.url).toString();
const CANVAS_LABEL = "Bản đồ lịch trình. Dùng phím mũi tên để di chuyển, phím cộng và trừ để phóng to, thu nhỏ.";
const LOCALE = { "Map.Title": CANVAS_LABEL };
const INITIAL_VIEW = { bounds: toMapBounds(VIETNAM_VIEW_BOUNDS) };
const MAP_SIZE = { width: "100%", height: "100%" } as const;
const ZOOM_EPSILON = 0.01;

type DayTokens = Readonly<{ colors: readonly string[]; dimmedOpacity: number }>;

const canZoomOut = (zoom: number, minZoom: number | undefined): boolean => {
  if (minZoom === undefined) return true;
  return zoom > minZoom + ZOOM_EPSILON;
};

export function TripMap({ pins, routes, camera, viewport, onPinSelect, onBackgroundClick, onStatusChange }: TripMapProps) {
  const describedById = useId();
  const mapRef = useRef<MapRef>(null);
  const loadedRef = useRef(false);
  const [tokens, setTokens] = useState<DayTokens | null>(null);
  const [zoom, setZoom] = useState<number | null>(null);
  const [minZoom, setMinZoom] = useState<number | undefined>(undefined);
  const ready = tokens !== null;
  const zoomInEnabled = zoom === null || zoom < MAP_MAX_ZOOM - ZOOM_EPSILON;
  const zoomOutEnabled = zoom === null || canZoomOut(zoom, minZoom);

  const statusRef = useRef(onStatusChange);
  useEffect(() => {
    statusRef.current = onStatusChange;
  });
  useEffect(() => {
    statusRef.current("loading");
  }, []);

  const refreshZoom = useCallback(() => {
    if (mapRef.current !== null) setZoom(mapRef.current.getZoom());
  }, []);

  const handleLoad = () => {
    loadedRef.current = true;
    setTokens({ colors: readDayColors(), dimmedOpacity: readDimmedOpacity() });
    onStatusChange("ready");
  };

  // Lỗi tile lẻ sau `load` bị bỏ qua: MapLibre để trống ô đó (D-120).
  const handleError = () => {
    if (!loadedRef.current) onStatusChange("error");
  };

  useMapCanvas(mapRef, { ready, describedById, onEscape: onBackgroundClick, onMinZoomChange: setMinZoom });
  useMapCamera(mapRef, camera, ready, viewport.padding);
  useEffect(() => {
    if (ready) refreshZoom();
  }, [ready, refreshZoom]);

  const zoomBy = (direction: "zoomIn" | "zoomOut") => {
    mapRef.current?.[direction]({ duration: moveDuration(prefersReducedMotion()) });
  };

  return (
    <div className="relative h-full w-full">
      <Map
        attributionControl={false}
        dragRotate={false}
        initialViewState={INITIAL_VIEW}
        locale={LOCALE}
        mapStyle={BASEMAP_STYLE}
        maxPitch={0}
        maxZoom={MAP_MAX_ZOOM}
        minZoom={minZoom}
        onClick={() => onBackgroundClick()}
        onError={handleError}
        onLoad={handleLoad}
        onZoomEnd={refreshZoom}
        pitchWithRotate={false}
        ref={mapRef}
        style={MAP_SIZE}
        touchPitch={false}
        workerUrl={WORKER_URL}
      >
        <RouteLayer
          colors={tokens?.colors ?? []}
          dimmedOpacity={tokens?.dimmedOpacity ?? 1}
          routes={routes}
          visible={ready}
        />
        <PinMarkers onPinSelect={onPinSelect} pins={pins} />
      </Map>
      <MapZoomControls
        canZoomIn={zoomInEnabled}
        canZoomOut={zoomOutEnabled}
        className="absolute right-stack-md top-stack-md"
        onZoomIn={() => zoomBy("zoomIn")}
        onZoomOut={() => zoomBy("zoomOut")}
        visible={ready}
      />
      <MapAttribution className="absolute right-inline-sm" style={{ bottom: viewport.coveredBottom + 8 }} visible={ready} />
      <p className="sr-only" id={describedById}>
        Danh sách điểm đến trong lịch trình có cùng nội dung với bản đồ.
      </p>
    </div>
  );
}
