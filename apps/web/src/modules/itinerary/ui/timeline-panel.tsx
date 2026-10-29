"use client";

// Cột timeline của editor (UI-SPEC §Editor, §Bố cục desktop, §Ngày trống và hướng dẫn): tab ngày, phụ đề, danh sách
// điểm đến kéo thả và thanh "Thêm điểm đến". Nằm trong cột trái từ `lg` hoặc trong Sheet dưới `lg`; không biết nó ở đâu.
//
// Nút "Thêm điểm đến" chỉ có MỘT bản tại mỗi thời điểm, và `addButtonRef` luôn trỏ vào nó: ngày có điểm thì là thanh dưới
// sticky; ngày không còn điểm hiển thị thì là nút trong EmptyState (do WaypointList render khi có `emptyAction`).
import { buildDayRange, type Itinerary, type Waypoint } from "@tripory/itinerary";
import { Button, Icon } from "@tripory/ui-web";
import { Plus } from "lucide-react";
import { useMemo, type RefObject } from "react";
import { DayTabs } from "./day-tabs";
import { DaySubtitle } from "./day-subtitle";
import { WaypointList, type WaypointFocusRequest } from "./waypoint-list";

export type TimelinePanelProps = Readonly<{
  itinerary: Itinerary;
  selectedDay: number;
  onSelectDay(dayNumber: number): void;
  /** Id đang chờ xóa (có thể hoàn tác): ẩn khỏi danh sách và không tính là "ngày có điểm". */
  pendingIds: ReadonlySet<string>;
  onRemove(waypoint: Waypoint): void;
  onFlushPending(): void;
  onAdd(dayNumber: number): void;
  onEdit(waypoint: Waypoint): void;
  highlightId: string | null;
  focusRequest: WaypointFocusRequest | null;
  addButtonRef: RefObject<HTMLButtonElement | null>;
}>;

export function TimelinePanel({
  itinerary,
  selectedDay,
  onSelectDay,
  pendingIds,
  onRemove,
  onFlushPending,
  onAdd,
  onEdit,
  highlightId,
  focusRequest,
  addButtonRef,
}: TimelinePanelProps) {
  const days = useMemo(() => buildDayRange(itinerary), [itinerary]);
  // Ngày đang chọn có thể vừa biến mất (lỗi thêm ngày được hoàn lại): rơi về ngày gần nhất thay vì render rỗng.
  const day = days.find((candidate) => candidate.dayNumber === selectedDay) ?? days.at(-1);
  if (day === undefined) return null;

  const hasVisibleWaypoints = day.waypoints.some((waypoint) => !pendingIds.has(waypoint.id));
  const add = () => onAdd(day.dayNumber);

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <div className="sticky top-0 z-sticky border-b border-border bg-surface">
        <DayTabs itinerary={itinerary} onSelectDay={onSelectDay} selectedDay={day.dayNumber} />
      </div>
      <div className="px-stack-md pt-stack-md">
        <DaySubtitle day={day} itineraryId={itinerary.id} key={day.dayNumber} />
      </div>
      <div className="flex-1 px-stack-md py-stack-md">
        <WaypointList
          addButtonRef={addButtonRef}
          day={day}
          emptyAction={add}
          focusRequest={focusRequest}
          highlightId={highlightId}
          itinerary={itinerary}
          onEdit={onEdit}
          onFlushPending={onFlushPending}
          onRemove={onRemove}
          pendingIds={pendingIds}
        />
      </div>
      {hasVisibleWaypoints ? (
        <div className="sticky bottom-0 border-t border-border bg-surface p-stack-md pb-[calc(var(--semantic-space-stack-md)+env(safe-area-inset-bottom))]">
          <Button className="w-full" onClick={add} ref={addButtonRef} variant="secondary">
            <Icon icon={Plus} size="sm" />
            Thêm điểm đến
          </Button>
        </div>
      ) : null}
    </div>
  );
}
