"use client";

// Đường nối mỗi ngày: một nguồn GeoJSON cục bộ và một lớp `line` nằm dưới mọi pin (D-124, D-115: không gửi dữ liệu đi đâu).
import type { DayRouteModel } from "@tripory/itinerary";
import { Layer, Source } from "react-map-gl/maplibre";

export const ROUTE_WIDTH_PX = 4;
export const ROUTE_OPACITY = 0.9;

type RouteFeature = Readonly<{
  type: "Feature";
  properties: Readonly<{ color: string; opacity: number; sortKey: number }>;
  geometry: Readonly<{ type: "LineString"; coordinates: readonly (readonly [number, number])[] }>;
}>;

export type RouteCollection = Readonly<{ type: "FeatureCollection"; features: readonly RouteFeature[] }>;

/** Màu lấy từ token (`colors[colorIndex - 1]`); ngày mờ dùng `dimmedOpacity` đọc từ `--map-dimmed-opacity`. */
export function buildRouteCollection(
  routes: readonly DayRouteModel[],
  colors: readonly string[],
  dimmedOpacity: number,
): RouteCollection {
  return {
    type: "FeatureCollection",
    features: routes.map((route) => ({
      type: "Feature",
      properties: {
        color: colors[route.colorIndex - 1] ?? "",
        opacity: route.dimmed ? dimmedOpacity : ROUTE_OPACITY,
        sortKey: route.sortKey,
      },
      geometry: { type: "LineString", coordinates: route.coordinates },
    })),
  };
}

export type RouteLayerProps = Readonly<{
  visible: boolean;
  routes: readonly DayRouteModel[];
  colors: readonly string[];
  dimmedOpacity: number;
}>;

export function RouteLayer({ visible, routes, colors, dimmedOpacity }: RouteLayerProps) {
  if (!visible) return null;
  return (
    <Source data={buildRouteCollection(routes, colors, dimmedOpacity) as never} id="trip-routes" type="geojson">
      <Layer
        id="trip-routes-line"
        layout={{ "line-join": "round", "line-cap": "round", "line-sort-key": ["get", "sortKey"] }}
        paint={{ "line-color": ["get", "color"], "line-opacity": ["get", "opacity"], "line-width": ROUTE_WIDTH_PX }}
        type="line"
      />
    </Source>
  );
}
