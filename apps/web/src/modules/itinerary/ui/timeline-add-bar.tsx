"use client";

// Thanh dính đáy của timeline (UI-SPEC §Bố cục): chứa nút "Thêm điểm đến" của tab ngày và của tab Tổng quan.
//
// Dưới `lg` timeline nằm trong Sheet 3 mức: popup luôn cao bằng mức expanded và bị dịch xuống ở mức thấp/vừa, nên đáy
// popup (nơi `sticky bottom-0` đứng) nằm ngoài màn hình. `EditorLayout` cho biết phần bị che (`TimelineHiddenBottomProvider`)
// và thanh dính nâng `bottom` đúng bằng đó để luôn thấy ở mọi mức. Ngoài Sheet (desktop) giá trị là 0.
import { createContext, useContext, type ReactNode } from "react";

const HiddenBottomContext = createContext(0);

/** `EditorLayout` bọc timeline bằng provider này với số px đáy popup đang bị che. */
export const TimelineHiddenBottomProvider = HiddenBottomContext.Provider;

export type TimelineAddBarProps = Readonly<{
  /** Nút bên trong; không có nút nào hiện thì thanh tự ẩn (`empty:hidden`). */
  children: ReactNode;
}>;

/**
 * Trình duyệt tính `bottom` của phần tử sticky từ mép để nội dung của vùng cuộn (đã trừ padding). Để mép dưới thanh trùng
 * đúng mép dưới màn hình ở mọi mức, `EditorLayout` bỏ padding đáy của popup (`pb-0`); vùng an toàn nằm trong padding của
 * chính thanh. Khi đó `bottom` bằng đúng phần đáy popup bị che.
 */
export function TimelineAddBar({ children }: TimelineAddBarProps) {
  const hiddenBottom = useContext(HiddenBottomContext);
  return (
    <div
      className="sticky bottom-0 border-t border-border bg-surface p-stack-md pb-[calc(var(--semantic-space-stack-md)+env(safe-area-inset-bottom))] transition-[bottom] duration-(--semantic-motion-duration-slow) ease-standard empty:hidden"
      style={{ bottom: hiddenBottom }}
    >
      {children}
    </div>
  );
}
