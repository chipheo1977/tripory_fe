"use client";

// Điểm đang chọn và ngày đang được rê/focus ở Tổng quan. Lựa chọn là state của editor, không nằm trong bản đồ,
// để danh sách và bản đồ đọc cùng một nguồn (UI-SPEC §Đồng bộ chọn và canh khung).
import { useCallback, useState } from "react";

export type MapSelection = Readonly<{
  selectedWaypointId: string | null;
  hoveredDay: number | null;
  select(id: string): void;
  /** Bỏ chọn điểm và bỏ nhấn mạnh ngày. */
  clear(): void;
  hoverDay(day: number | null): void;
}>;

export function useMapSelection(): MapSelection {
  const [selectedWaypointId, setSelected] = useState<string | null>(null);
  const [hoveredDay, setHoveredDay] = useState<number | null>(null);
  const select = useCallback((id: string) => setSelected(id), []);
  const clear = useCallback(() => {
    setSelected(null);
    setHoveredDay(null);
  }, []);
  const hoverDay = useCallback((day: number | null) => setHoveredDay(day), []);
  return { selectedWaypointId, hoveredDay, select, clear, hoverDay };
}
