"use client";

// Tab Ngày chỉ đọc của chế độ Bản đồ (D-10): phụ đề, "X điểm · Y km", danh sách điểm chọn được. Không dnd-kit, không nút thêm/sửa/xóa.
// Ngày trống hiện thông báo thay cho danh sách (không CTA).
import type { DayView, Waypoint } from "@tripory/itinerary";
import { EmptyState, Icon } from "@tripory/ui-web";
import { MapPin } from "lucide-react";
import { daySectionMeta } from "./public-format";
import { PublicWaypointItem } from "./public-waypoint-item";

export type PublicDayPanelProps = Readonly<{
  day: DayView;
  selectedId: string | null;
  mapReady: boolean;
  onSelect(waypoint: Waypoint): void;
}>;

function DaySubtitleLine({ text }: Readonly<{ text: string | null }>) {
  const subtitle = text?.trim() ?? "";
  if (subtitle === "") return null;
  return <p className="break-words px-stack-md pt-stack-md text-body font-semibold text-text">{subtitle}</p>;
}

function DayMetaLine({ text }: Readonly<{ text: string | null }>) {
  if (text === null) return null;
  return <p className="px-stack-md text-label font-regular tabular-nums text-muted">{text}</p>;
}

function DayPanelBody({ day, selectedId, mapReady, onSelect }: PublicDayPanelProps) {
  if (day.waypoints.length === 0) {
    return (
      <div className="px-stack-md py-stack-md">
        <EmptyState
          body="Người tạo chưa thêm điểm đến cho ngày này."
          heading={`Chưa có điểm đến nào trong Ngày ${day.dayNumber}`}
          icon={<Icon icon={MapPin} size="lg" />}
          variant="compact"
        />
      </div>
    );
  }
  return (
    <ol aria-label={`Điểm đến Ngày ${day.dayNumber}`} className="flex flex-col gap-inline-sm px-stack-md py-stack-md">
      {day.waypoints.map((waypoint, index) => (
        <PublicWaypointItem
          key={waypoint.id}
          mapReady={mapReady}
          onSelect={() => onSelect(waypoint)}
          position={index + 1}
          selected={waypoint.id === selectedId}
          waypoint={waypoint}
        />
      ))}
    </ol>
  );
}

export function PublicDayPanel(props: PublicDayPanelProps) {
  const { day } = props;
  return (
    <div className="flex flex-1 flex-col">
      <DaySubtitleLine text={day.subtitle} />
      <DayMetaLine text={daySectionMeta(day.waypoints.length, day.distanceKm)} />
      <DayPanelBody {...props} />
    </div>
  );
}
