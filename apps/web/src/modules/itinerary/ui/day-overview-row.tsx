"use client";

// Một dòng ngày ở tab Tổng quan (D-135): bấm để xem ngày đó; rê/focus báo ngày cần nhấn mạnh trên bản đồ (desktop).
// Nhận đúng các trường cần dùng của `DaySummary`, không nhận cả lịch trình (coding-rules I).
import type { DaySummary } from "@tripory/itinerary";
import { cn, Icon, MapToneDot } from "@tripory/ui-web";
import { dayColorIndex } from "@tripory/itinerary";
import { ChevronRight } from "lucide-react";
import { dayRowAccessibleName, dayRowMeta, dayRowTitle } from "./overview-format";

/** `selected`: ngày của pin đang chọn (D-136). `recent`: vừa thêm điểm từ Tổng quan, 1500ms (D-139). */
export type DayRowEmphasis = "none" | "selected" | "recent";

export type DayOverviewRowProps = Readonly<{
  day: Pick<DaySummary, "dayNumber" | "subtitle" | "waypointCount" | "distanceKm">;
  emphasis: DayRowEmphasis;
  onSelectDay(dayNumber: number): void;
  /** `null` khi rời dòng. Nơi gọi truyền hàm rỗng dưới `lg` (không nhấn mạnh trên mobile). */
  onEmphasizeDay(dayNumber: number | null): void;
}>;

const EMPHASIS_CLASS: Readonly<Record<DayRowEmphasis, string>> = {
  none: "",
  selected: "ring-2 ring-inset ring-text",
  recent: "border-primary-border bg-primary-subtle transition-colors duration-(--semantic-motion-duration-slow)",
};

export function DayOverviewRow({ day, emphasis, onSelectDay, onEmphasizeDay }: DayOverviewRowProps) {
  return (
    <li>
      <button
        aria-label={dayRowAccessibleName(day)}
        className={cn(
          "flex min-h-touch w-full items-start gap-inline-sm rounded-container border border-border bg-surface px-stack-md py-stack-sm text-left hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring",
          EMPHASIS_CLASS[emphasis],
        )}
        data-day-row={day.dayNumber}
        onBlur={() => onEmphasizeDay(null)}
        onClick={() => onSelectDay(day.dayNumber)}
        onFocus={() => onEmphasizeDay(day.dayNumber)}
        onMouseEnter={() => onEmphasizeDay(day.dayNumber)}
        onMouseLeave={() => onEmphasizeDay(null)}
        type="button"
      >
        <MapToneDot className="mt-inline-xs" tone={dayColorIndex(day.dayNumber)} />
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-body font-semibold text-text">{dayRowTitle(day)}</span>
          <span className="text-label tabular-nums text-muted">{dayRowMeta(day)}</span>
        </span>
        <Icon className="mt-inline-xs text-muted" icon={ChevronRight} size="sm" />
      </button>
    </li>
  );
}
