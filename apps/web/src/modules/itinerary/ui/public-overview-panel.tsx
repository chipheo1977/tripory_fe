"use client";

// Tab Tổng quan chỉ đọc của chế độ Bản đồ (D-10, D-131..D-136): thông tin chung và tóm tắt từng ngày (dòng bấm được).
// Khác `OverviewPanel` của editor: không nút "Thêm điểm đến", không vùng bấm sửa. Thẻ gốc KHÔNG `min-h-full`: thanh viên
// thuốc dính đáy của sheet (plan 05-15) là anh em đứng sau panel này trong vùng cuộn, nên panel không được tự chiếm hết
// chiều cao và đẩy thanh ra ngoài khung nhìn.
import type { DaySummary } from "@tripory/itinerary";
import type { ReactNode } from "react";
import { DayOverviewRow, type DayRowEmphasis } from "./day-overview-row";
import type { PublicOverviewData } from "./public-format";
import { PublicOverviewSummary } from "./public-overview-summary";

export type PublicOverviewPanelProps = Readonly<{
  data: PublicOverviewData;
  author: ReactNode;
  days: readonly DaySummary[];
  variant: "wide" | "compact";
  rowEmphasis(dayNumber: number): DayRowEmphasis;
  onSelectDay(dayNumber: number): void;
  onEmphasizeDay(dayNumber: number | null): void;
  /** Slot social của tab Tổng quan (D-22). */
  social?: ReactNode;
}>;

export function PublicOverviewPanel({
  data,
  author,
  days,
  variant,
  rowEmphasis,
  onSelectDay,
  onEmphasizeDay,
  social,
}: PublicOverviewPanelProps) {
  return (
    <div className="flex flex-1 flex-col">
      <div className="px-stack-md py-stack-sm">
        <PublicOverviewSummary author={author} data={data} social={social} variant={variant} />
      </div>
      <h3 className="border-t border-border px-stack-md pt-stack-sm text-label font-semibold text-muted">Các ngày</h3>
      <ol aria-label="Tóm tắt các ngày" className="flex flex-col gap-inline-sm px-stack-md py-stack-md">
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
    </div>
  );
}
