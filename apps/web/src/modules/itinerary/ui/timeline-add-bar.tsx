"use client";

// Thanh dính đáy của timeline (UI-SPEC §Bố cục): chứa nút "Thêm điểm đến" của tab ngày và của tab Tổng quan.
// `sticky bottom-0` bám đáy vùng cuộn gần nhất: cột trái từ `lg`, hoặc vùng cuộn của `TimelinePanel` trong Sheet (vùng đó
// chỉ cao bằng phần nhìn thấy của sheet, nên thanh luôn sát đáy màn hình ở mọi mức).
import type { ReactNode } from "react";

export type TimelineAddBarProps = Readonly<{
  /** Nút bên trong; không có nút nào hiện thì thanh tự ẩn (`empty:hidden`). */
  children: ReactNode;
}>;

export function TimelineAddBar({ children }: TimelineAddBarProps) {
  return (
    <div className="sticky bottom-0 border-t border-border bg-surface p-stack-md pb-[calc(var(--semantic-space-stack-md)+env(safe-area-inset-bottom))] empty:hidden">
      {children}
    </div>
  );
}
