"use client";

// Danh sách điểm đến của một ngày: kéo thả sắp xếp (ITIN-08) và nối luồng xóa có hoàn tác (ITIN-07).
// D-22..D-23, D-33, D-34, D-37, RESEARCH Pattern 12, Pitfall 7/8, UI-SPEC §WaypointList và SortableWaypointItem.
//
// Cảm biến: Mouse (≥ 4px), Touch (nhấn giữ 180ms, dung sai 8px), Keyboard. Cảm biến con trỏ chung của dnd-kit bị
// bỏ vì nó nhận cả ngón tay và phá nhấn giữ (ghi đè dòng tương ứng trong bảng hằng của UI-SPEC).
//
// Tập id gửi BE luôn là tập đang hiển thị. Bắt đầu kéo thì `onFlushPending` gửi DELETE đang chờ ngay (D-33); lệnh
// DELETE và reorder cùng `scope` của hook nên reorder chạy sau. Nếu cache chưa kịp khớp (tập hiển thị khác tập của
// ngày) thì không gửi: báo "Danh sách đã thay đổi, đã tải lại" và tải lại, thay vì để BE trả `InvalidReorderList`.
import {
  closestCenter,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { restrictToFirstScrollableAncestor, restrictToVerticalAxis } from "@dnd-kit/modifiers";
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { isApiError } from "@tripory/api-client";
import { isSameOrder, isValidDayOrder, moveItem, type DayView, type Itinerary, type Waypoint } from "@tripory/itinerary";
import { itineraryKeys } from "@tripory/itinerary/react";
import { EmptyState, Icon, notify } from "@tripory/ui-web";
import { useQueryClient } from "@tanstack/react-query";
import { MapPin } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore, type RefObject } from "react";
import { createPortal } from "react-dom";
import { itinerary as itineraryHooks } from "@/composition/itinerary.client";
import { decideMutationError } from "@/lib/feedback";
import { AddButton } from "./add-button";
import { VI_DRAG_INSTRUCTIONS, viAnnouncements } from "./dnd-announcements";
import { useMediaQuery } from "./use-media-query";
import { useSaveStatusStore } from "./save-status";
import { SortableWaypointItem, WaypointCardOverlay } from "./sortable-waypoint-item";

const INVALID_REORDER_LIST = "Itinerary.InvalidReorderList";
const LIST_CHANGED_MESSAGE = "Danh sách đã thay đổi, đã tải lại";

export type WaypointFocusRequest = Readonly<{
  waypointId: string | null;
  /** `main`: nút chính của thẻ; `handle`: tay cầm kéo; `add`: nút "Thêm điểm đến" (`addButtonRef`). */
  target: "main" | "handle" | "add";
}>;

export type WaypointListProps = Readonly<{
  itinerary: Itinerary;
  day: DayView;
  /** Id đang chờ xóa (hook `usePendingDelete`): ẩn khỏi danh sách dù cache còn giữ. */
  pendingIds: ReadonlySet<string>;
  onRemove(waypoint: Waypoint): void;
  onFlushPending(): void;
  onEdit(waypoint: Waypoint): void;
  /** Hành động của EmptyState khi ngày không có điểm nào hiển thị; không truyền thì EmptyState không có nút. */
  emptyAction?: (() => void) | undefined;
  /** Điểm vừa thêm (1500ms). */
  highlightId: string | null;
  focusRequest: WaypointFocusRequest | null;
  /** Nút "Thêm điểm đến": ngày trống thì là nút trong EmptyState, ngày có điểm thì là thanh dưới của TimelinePanel. */
  addButtonRef: RefObject<HTMLButtonElement | null>;
}>;

const subscribeNever = (): (() => void) => () => undefined;
const getBody = (): HTMLElement => document.body;
const getNoBody = (): null => null;

const findByDataset = (root: ParentNode | null, attribute: "waypointMain" | "waypointHandle", id: string) => {
  if (root === null) return null;
  const selector = attribute === "waypointMain" ? "[data-waypoint-main]" : "[data-waypoint-handle]";
  for (const element of root.querySelectorAll<HTMLElement>(selector)) {
    if (element.dataset[attribute] === id) return element;
  }
  return null;
};

export function WaypointList({
  itinerary,
  day,
  pendingIds,
  onRemove,
  onFlushPending,
  onEdit,
  emptyAction,
  highlightId,
  focusRequest,
  addButtonRef,
}: WaypointListProps) {
  const store = useSaveStatusStore();
  const queryClient = useQueryClient();
  const reducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
  const listRef = useRef<HTMLOListElement | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  // Portal ra `document.body` chỉ làm được ở client (SSR không có `document`).
  const portalTarget = useSyncExternalStore(subscribeNever, getBody, getNoBody);

  const visible = useMemo(
    () => day.waypoints.filter((waypoint) => !pendingIds.has(waypoint.id)),
    [day.waypoints, pendingIds],
  );
  const visibleIds = useMemo(() => visible.map((waypoint) => waypoint.id), [visible]);
  const nameOf = (id: string): string => visible.find((waypoint) => waypoint.id === id)?.name ?? "";

  const refetch = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: itineraryKeys.detail(itinerary.id) });
  }, [queryClient, itinerary.id]);

  const reorder = itineraryHooks.useReorderWaypoints(itinerary.id, {
    meta: { feedback: { errorToast: false } },
    onSuccess: () => store.markSaved(),
    onError: (error, variables) => {
      // BE báo tập id lệch tập hiện có (hai tab cùng sửa): hook đã trả cache cũ và sẽ tải lại; không phải lỗi lưu.
      if (isApiError(error) && error.code === INVALID_REORDER_LIST) {
        notify.info(LIST_CHANGED_MESSAGE);
        return;
      }
      const decision = decideMutationError(error);
      if (decision !== null) notify.error(decision.message);
      store.markFailed(() => reorder.mutate(variables));
    },
  });

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const focusHandleSoon = (id: string): void => {
    // Sau khi thả, thẻ hiện lại (hết `invisible`) rồi mới nhận focus được.
    requestAnimationFrame(() => findByDataset(listRef.current, "waypointHandle", id)?.focus());
  };

  const handleDragStart = ({ active }: DragStartEvent): void => {
    setActiveId(String(active.id));
    onFlushPending();
  };

  const handleDragEnd = ({ active, over }: DragEndEvent): void => {
    const id = String(active.id);
    setActiveId(null);
    focusHandleSoon(id);
    if (over === null || over.id === active.id) return;

    const next = moveItem(visibleIds, visibleIds.indexOf(id), visibleIds.indexOf(String(over.id)));
    if (isSameOrder(next, visibleIds)) return;
    if (!isValidDayOrder(itinerary, day.dayNumber, next)) {
      notify.info(LIST_CHANGED_MESSAGE);
      refetch();
      return;
    }
    reorder.mutate({ dayNumber: day.dayNumber, orderedIds: next });
  };

  const handleDragCancel = (): void => {
    if (activeId !== null) focusHandleSoon(activeId);
    setActiveId(null);
  };

  useEffect(() => {
    if (focusRequest === null) return;
    if (focusRequest.target === "add") {
      addButtonRef.current?.focus();
      return;
    }
    if (focusRequest.waypointId === null) return;
    const attribute = focusRequest.target === "main" ? "waypointMain" : "waypointHandle";
    findByDataset(listRef.current, attribute, focusRequest.waypointId)?.focus();
  }, [focusRequest, addButtonRef]);

  useEffect(() => {
    if (highlightId === null) return;
    findByDataset(listRef.current, "waypointMain", highlightId)
      ?.closest("li")
      ?.scrollIntoView?.({ block: "nearest", behavior: reducedMotion ? "auto" : "smooth" });
  }, [highlightId, reducedMotion]);

  if (visible.length === 0) {
    return (
      <EmptyState
        action={
          <AddButton
            label="Thêm điểm đến"
            onClick={emptyAction}
            ref={addButtonRef}
            variant="primary"
            visible={emptyAction !== undefined}
          />
        }
        body="Dán tọa độ hoặc link Google Maps để thêm điểm đầu tiên."
        heading={`Chưa có điểm đến nào trong Ngày ${day.dayNumber}`}
        icon={<Icon icon={MapPin} size="lg" />}
        variant="compact"
      />
    );
  }

  const activeIndex = activeId === null ? -1 : visibleIds.indexOf(activeId);
  const activeWaypoint = activeIndex < 0 ? undefined : visible[activeIndex];

  return (
    <DndContext
      accessibility={{
        announcements: viAnnouncements(() => visibleIds, nameOf),
        screenReaderInstructions: { draggable: VI_DRAG_INSTRUCTIONS },
      }}
      collisionDetection={closestCenter}
      modifiers={[restrictToVerticalAxis, restrictToFirstScrollableAncestor]}
      onDragCancel={handleDragCancel}
      onDragEnd={handleDragEnd}
      onDragStart={handleDragStart}
      sensors={sensors}
    >
      <SortableContext items={visibleIds} strategy={verticalListSortingStrategy}>
        <ol
          aria-label={`Điểm đến Ngày ${day.dayNumber}`}
          className="flex flex-col gap-inline-sm"
          data-base-ui-swipe-ignore={activeId === null ? undefined : ""}
          ref={listRef}
        >
          {visible.map((waypoint, index) => (
            <SortableWaypointItem
              highlighted={waypoint.id === highlightId}
              key={waypoint.id}
              onEdit={onEdit}
              onRemove={onRemove}
              position={index + 1}
              reducedMotion={reducedMotion}
              showHandle={visible.length > 1}
              waypoint={waypoint}
            />
          ))}
        </ol>
      </SortableContext>
      {portalTarget === null
        ? null
        : createPortal(
            // Overlay phải nằm trên popup của Sheet (`z-modal`, Pitfall 8); `style` ghi đè `zIndex = 999` mặc định.
            <DragOverlay dropAnimation={reducedMotion ? null : undefined} style={{ zIndex: "var(--z-index-toast)" }}>
              {activeWaypoint === undefined ? null : (
                <WaypointCardOverlay position={activeIndex + 1} waypoint={activeWaypoint} />
              )}
            </DragOverlay>,
            portalTarget,
          )}
    </DndContext>
  );
}
