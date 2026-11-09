"use client";

// Thân tab Ngày N (UI-SPEC §Ngày trống và hướng dẫn): phụ đề, danh sách điểm đến kéo thả và thanh "Thêm điểm đến".
//
// Nút "Thêm điểm đến" chỉ có MỘT bản tại mỗi thời điểm, và `addButtonRef` luôn trỏ vào nó: ngày có điểm thì là thanh dưới
// sticky; ngày không còn điểm hiển thị thì là nút trong EmptyState (do WaypointList render khi có `emptyAction`).
import type { DayView, Itinerary, Waypoint } from "@tripory/itinerary";
import type { RefObject } from "react";
import { AddButton } from "./add-button";
import { DaySubtitle } from "./day-subtitle";
import { TimelineAddBar } from "./timeline-add-bar";
import { WaypointList, type WaypointFocusRequest, type WaypointSelection } from "./waypoint-list";

export type DayPanelProps = Readonly<{
  itinerary: Itinerary;
  day: DayView;
  /** Id đang chờ xóa (có thể hoàn tác): ẩn khỏi danh sách và không tính là "ngày có điểm". */
  pendingIds: ReadonlySet<string>;
  list: Readonly<{
    onRemove(waypoint: Waypoint): void;
    onFlushPending(): void;
    onEdit(waypoint: Waypoint): void;
    /** Chỉ truyền khi bản đồ sẵn sàng: nút chính của thẻ chọn điểm thay vì mở form sửa (D-126). */
    selection?: WaypointSelection;
  }>;
  feedback: Readonly<{ highlightId: string | null; focusRequest: WaypointFocusRequest | null }>;
  onAdd(dayNumber: number): void;
  addButtonRef: RefObject<HTMLButtonElement | null>;
}>;

export function DayPanel({ itinerary, day, pendingIds, list, feedback, onAdd, addButtonRef }: DayPanelProps) {
  const hasVisibleWaypoints = day.waypoints.some((waypoint) => !pendingIds.has(waypoint.id));
  const add = () => onAdd(day.dayNumber);
  return (
    <>
      <div className="px-stack-md pt-stack-md">
        <DaySubtitle day={day} itineraryId={itinerary.id} key={day.dayNumber} />
      </div>
      <div className="flex-1 px-stack-md py-stack-md">
        <WaypointList
          addButtonRef={addButtonRef}
          day={day}
          emptyAction={add}
          focusRequest={feedback.focusRequest}
          highlightId={feedback.highlightId}
          itinerary={itinerary}
          onEdit={list.onEdit}
          onFlushPending={list.onFlushPending}
          onRemove={list.onRemove}
          pendingIds={pendingIds}
          selection={list.selection}
        />
      </div>
      <TimelineAddBar>
        <AddButton
          className="w-full"
          label="Thêm điểm đến"
          onClick={add}
          ref={addButtonRef}
          variant="secondary"
          visible={hasVisibleWaypoints}
        />
      </TimelineAddBar>
    </>
  );
}
