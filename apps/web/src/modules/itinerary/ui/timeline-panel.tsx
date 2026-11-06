"use client";

// Khung cột timeline của editor (UI-SPEC §Editor, §Bố cục desktop): thanh tab sticky ở trên, thân tab ở dưới.
// Nằm trong cột trái từ `lg` hoặc trong Sheet dưới `lg`; không biết nó ở đâu và không biết tab nào đang chọn:
// thân là `DayPanel` (tab ngày) hoặc `OverviewPanel` (tab Tổng quan) do editor ghép vào.
import type { ReactNode } from "react";

export type TimelinePanelProps = Readonly<{
  /** `DayTabs`, đặt trong thanh sticky. */
  tabs: ReactNode;
  children: ReactNode;
}>;

export function TimelinePanel({ tabs, children }: TimelinePanelProps) {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <div className="sticky top-0 z-sticky border-b border-border bg-surface">{tabs}</div>
      {children}
    </div>
  );
}
