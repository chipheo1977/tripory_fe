"use client";

// Một điểm trong tab Ngày chỉ đọc (D-10, D-128, UI-SPEC §PublicWaypointItem): nút chọn điểm (đường chính cho bàn phím), khi chọn
// hiện chi tiết NGAY SAU nút (ghi chú + link Google Maps). Không kéo thả, không menu ⋯, không sửa/xóa. Tên, địa chỉ, ghi chú
// là text node (không HTML, T-05-48).
import type { Waypoint } from "@tripory/itinerary";
import { cn, mapToneClass } from "@tripory/ui-web";
import { useId } from "react";
import { MapsLink } from "./maps-link";

export type PublicWaypointItemProps = Readonly<{
  waypoint: Waypoint;
  /** Số thứ tự trong ngày, tính từ 1. */
  position: number;
  selected: boolean;
  /** Bản đồ đã sẵn sàng: nút mô tả "Nhấn để xem trên bản đồ" (không thì chỉ chọn dòng). */
  mapReady: boolean;
  onSelect(): void;
}>;

const SELECTED_CLASS = { true: "ring-2 ring-inset ring-text", false: "" } as const;

function AddressLine({ text }: Readonly<{ text: string | null }>) {
  if (text === null) return null;
  return <span className="line-clamp-1 text-label font-regular text-muted">{text}</span>;
}

function MapHint({ id, visible }: Readonly<{ id: string; visible: boolean }>) {
  if (!visible) return null;
  return (
    <span className="sr-only" id={id}>
      Nhấn để xem trên bản đồ
    </span>
  );
}

function NotesText({ text }: Readonly<{ text: string | null }>) {
  if (text === null) return null;
  return <p className="mb-inline-sm break-words whitespace-pre-line text-body text-text">{text}</p>;
}

function WaypointDetails({ waypoint, visible }: Readonly<{ waypoint: Waypoint; visible: boolean }>) {
  if (!visible) return null;
  return (
    <div className="px-stack-md pt-inline-sm">
      <NotesText text={waypoint.notes} />
      <MapsLink latitude={waypoint.coordinate.latitude} longitude={waypoint.coordinate.longitude} name={waypoint.name} />
    </div>
  );
}

export function PublicWaypointItem({ waypoint, position, selected, mapReady, onSelect }: PublicWaypointItemProps) {
  const hintId = useId();
  return (
    <li>
      <button
        aria-current={selected ? "true" : undefined}
        aria-describedby={mapReady ? hintId : undefined}
        className={cn(
          "flex min-h-touch w-full items-start gap-inline-sm rounded-container border border-border bg-surface px-stack-md py-stack-sm text-left hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring",
          SELECTED_CLASS[selected ? "true" : "false"],
        )}
        onClick={onSelect}
        type="button"
      >
        <span
          aria-hidden="true"
          className={cn(
            "flex size-(--map-pin-size) shrink-0 items-center justify-center rounded-pill text-label font-semibold tabular-nums text-text-inverse",
            mapToneClass(waypoint.dayNumber),
          )}
        >
          {position}
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="line-clamp-2 break-words text-body font-semibold text-text">{waypoint.name}</span>
          <AddressLine text={waypoint.address} />
        </span>
      </button>
      <MapHint id={hintId} visible={mapReady} />
      <WaypointDetails visible={selected} waypoint={waypoint} />
    </li>
  );
}
