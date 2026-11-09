"use client";

// Chỉ nạp bản đồ phía client (MapLibre cần WebGL/DOM). `ssr: false` chỉ dùng được trong Client Component
// (docs Next 16.4, guides/lazy-loading). Không có `loading`: EditorMapArea tự hiện skeleton theo trạng thái.
import dynamic from "next/dynamic";

export const LazyTripMap = dynamic(() => import("./trip-map").then((mod) => mod.TripMap), { ssr: false });
