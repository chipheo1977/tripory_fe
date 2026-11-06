"use client";

// Thẻ điểm đến sắp xếp được (ITIN-08, D-22, D-23, D-34, UI-SPEC §WaypointList và SortableWaypointItem).
// Ba vùng không lồng nhau: tay cầm kéo (nút riêng, là activator của dnd-kit), nút chính (chọn điểm trên bản đồ khi bản đồ
// hiển thị, mở form sửa khi không: D-126), menu ⋯ (luôn có "Sửa" và "Xóa").
// Tay cầm có `touch-none` để cử chỉ nhấn giữ không bị trình duyệt hiểu là cuộn, và `data-base-ui-swipe-ignore`
// để Drawer của Base UI (Sheet) không coi cử chỉ kéo là vuốt đóng sheet (RESEARCH Pitfall 8).
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Waypoint } from "@tripory/itinerary";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Icon,
  cn,
} from "@tripory/ui-web";
import { GripVertical, MoreHorizontal, Pencil, Trash2 } from "lucide-react";

/** Hành động của thẻ: `onActivate` là nút chính (chọn điểm hoặc mở form sửa, do nơi dùng quyết định). */
export type WaypointItemActions = Readonly<{
  onActivate(waypoint: Waypoint): void;
  onEdit(waypoint: Waypoint): void;
  onRemove(waypoint: Waypoint): void;
}>;

export type WaypointItemAppearance = Readonly<{
  /** Vừa thêm: nền nhấn nhẹ trong 1500ms. */
  highlighted: boolean;
  /** Điểm đang chọn trên bản đồ: `aria-current` và viền chọn (D-125). */
  selected: boolean;
  /** `prefers-reduced-motion`: bỏ chuyển động dịch chỗ. */
  reducedMotion: boolean;
  /** Id phần tử sr-only mô tả nút chính ("Nhấn để xem trên bản đồ"); `null` khi nút chính mở form sửa. */
  hintId: string | null;
}>;

export type SortableWaypointItemProps = Readonly<{
  waypoint: Waypoint;
  /** Số thứ tự hiển thị (1-based), tính trên tập đang hiển thị. */
  position: number;
  /** Ngày chỉ có một điểm thì không có gì để sắp xếp (D-23). */
  showHandle: boolean;
  appearance: WaypointItemAppearance;
  actions: WaypointItemActions;
}>;

const cardClass =
  "rounded-container border border-border bg-surface flex items-center min-h-touch";

export function SortableWaypointItem({
  waypoint,
  position,
  showHandle,
  appearance,
  actions,
}: SortableWaypointItemProps) {
  const { highlighted, selected, reducedMotion, hintId } = appearance;
  const { setNodeRef, setActivatorNodeRef, attributes, listeners, transform, transition, isDragging } = useSortable({
    id: waypoint.id,
    transition: reducedMotion ? null : undefined,
  });
  const { name, address } = waypoint;

  return (
    <li
      className={cn(
        cardClass,
        highlighted && "border-primary-border bg-primary-subtle transition-colors duration-(--semantic-motion-duration-slow)",
        selected && "ring-2 ring-inset ring-text",
        isDragging && "border-dashed border-border-strong bg-surface-muted [&>*]:invisible",
      )}
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
    >
      {showHandle ? (
        <button
          {...attributes}
          {...listeners}
          aria-label={`Kéo để sắp xếp ${name}`}
          aria-roledescription="điểm đến có thể sắp xếp"
          className="flex size-touch shrink-0 cursor-grab touch-none items-center justify-center text-muted outline-hidden focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring active:cursor-grabbing"
          data-base-ui-swipe-ignore=""
          data-waypoint-handle={waypoint.id}
          ref={setActivatorNodeRef}
          type="button"
        >
          <Icon icon={GripVertical} size="md" />
        </button>
      ) : null}
      <button
        aria-current={selected ? "true" : undefined}
        aria-describedby={hintId ?? undefined}
        aria-label={address === null ? `${position} ${name}` : `${position} ${name}, ${address}`}
        className={cn(
          "flex min-w-0 flex-1 items-center gap-control-gap py-inline-sm text-left outline-hidden hover:bg-surface-muted focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus-ring",
          showHandle ? "" : "pl-inline-sm",
        )}
        data-waypoint-main={waypoint.id}
        onClick={() => actions.onActivate(waypoint)}
        type="button"
      >
        <span
          aria-hidden
          className="flex size-6 shrink-0 items-center justify-center rounded-pill bg-surface-muted text-label font-semibold tabular-nums"
        >
          {position}
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-body font-semibold text-text">{name}</span>
          {address === null ? null : <span className="line-clamp-1 text-label text-muted">{address}</span>}
        </span>
      </button>
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label={`Thao tác cho "${name}"`}
          className="min-w-touch shrink-0 border-transparent bg-transparent p-0"
        >
          <Icon icon={MoreHorizontal} size="md" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem aria-label="Sửa" onClick={() => actions.onEdit(waypoint)}>
            <Icon icon={Pencil} size="sm" />
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem aria-label="Xóa" onClick={() => actions.onRemove(waypoint)} variant="danger">
            <Icon icon={Trash2} size="sm" />
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </li>
  );
}

/** Bản tĩnh của thẻ đang kéo, vẽ trong `DragOverlay` (UI-SPEC: không xoay, không phóng to). */
export function WaypointCardOverlay({ waypoint, position }: Readonly<{ waypoint: Waypoint; position: number }>) {
  return (
    <div className={cn(cardClass, "border-primary-border bg-surface-elevated shadow-md")}>
      <span className="flex size-touch shrink-0 cursor-grabbing items-center justify-center text-muted">
        <Icon icon={GripVertical} size="md" />
      </span>
      <span className="flex min-w-0 flex-1 items-center gap-control-gap py-inline-sm text-left">
        <span
          aria-hidden
          className="flex size-6 shrink-0 items-center justify-center rounded-pill bg-surface-muted text-label font-semibold tabular-nums"
        >
          {position}
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-body font-semibold text-text">{waypoint.name}</span>
          {waypoint.address === null ? null : (
            <span className="line-clamp-1 text-label text-muted">{waypoint.address}</span>
          )}
        </span>
      </span>
    </div>
  );
}
