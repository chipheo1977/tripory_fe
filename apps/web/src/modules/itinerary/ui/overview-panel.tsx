"use client";

// Tab Tổng quan (D-131..D-140): chỉ xem. Thông tin chung, tóm tắt từng ngày, và nút "Thêm điểm đến" (ngoại lệ duy nhất, D-138).
// Không có phụ đề, không liệt kê điểm, không sửa/xóa/kéo thả (D-134, D-137). Không biết nó nằm ở cột trái hay trong sheet.
import type { DaySummary } from "@tripory/itinerary";
import type { RefObject } from "react";
import { AddButton } from "./add-button";
import { DayOverviewRow, type DayRowEmphasis } from "./day-overview-row";
import type { OverviewSummaryData } from "./overview-format";
import { OverviewSummary } from "./overview-summary";

export type OverviewPanelProps = Readonly<{
  summary: OverviewSummaryData;
  days: readonly DaySummary[];
  variant: "wide" | "compact";
  rowEmphasis(dayNumber: number): DayRowEmphasis;
  onSelectDay(dayNumber: number): void;
  onEmphasizeDay(dayNumber: number | null): void;
  actions: Readonly<{
    onEdit(): void;
    onAdd(): void;
    addButtonRef: RefObject<HTMLButtonElement | null>;
  }>;
}>;

export function OverviewPanel({ summary, days, variant, rowEmphasis, onSelectDay, onEmphasizeDay, actions }: OverviewPanelProps) {
  const { onEdit, onAdd, addButtonRef } = actions;
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <div className="px-stack-md pt-stack-md">
        <OverviewSummary data={summary} onEdit={onEdit} variant={variant} />
      </div>
      <h3 className="border-t border-border px-stack-md pt-stack-md text-label font-semibold text-muted">Các ngày</h3>
      <ol aria-label="Tóm tắt các ngày" className="flex flex-1 flex-col gap-inline-sm px-stack-md py-stack-md">
        {days.map((day) => (
          <DayOverviewRow
            day={day}
            emphasis={rowEmphasis(day.dayNumber)}
            key={day.dayNumber}
            onEmphasizeDay={onEmphasizeDay}
            onSelectDay={onSelectDay}
          />
        ))}
      </ol>
      <div className="sticky bottom-0 border-t border-border bg-surface p-stack-md pb-[calc(var(--semantic-space-stack-md)+env(safe-area-inset-bottom))]">
        <AddButton className="w-full" label="Thêm điểm đến" onClick={onAdd} ref={addButtonRef} variant="secondary" />
      </div>
    </div>
  );
}
