"use client";

// Thanh dính đáy của timeline (UI-SPEC §Bố cục): chứa nút "Thêm điểm đến" của tab ngày và của tab Tổng quan.
//
// Dưới `lg` timeline nằm trong Sheet 3 mức: popup luôn cao bằng mức expanded và bị dịch xuống ở mức thấp/vừa, nên đáy
// popup (nơi `sticky bottom-0` đứng) nằm ngoài màn hình. `EditorLayout` cho biết phần bị che (`TimelineHiddenBottomProvider`)
// và thanh dính nâng `bottom` đúng bằng đó để luôn thấy ở mọi mức. Ngoài Sheet (desktop) giá trị là 0.
import { createContext, useContext, type CSSProperties, type ReactNode } from "react";

const HiddenBottomContext = createContext(0);

/** `EditorLayout` bọc timeline bằng provider này với số px đáy popup đang bị che. */
export const TimelineHiddenBottomProvider = HiddenBottomContext.Provider;

export type TimelineAddBarProps = Readonly<{
  /** Nút bên trong; không có nút nào hiện thì thanh tự ẩn (`empty:hidden`). */
  children: ReactNode;
}>;

/** Đệm đáy của popup Sheet (`p-stack-lg` + vùng an toàn). */
const POPUP_BOTTOM_PADDING = "(var(--semantic-space-stack-lg) + env(safe-area-inset-bottom))";

/**
 * Trình duyệt tính `bottom` của phần tử sticky từ mép ĐỂ NỘI DUNG của popup (đã trừ đệm đáy), nên khi nâng lên phải trừ
 * đệm đó thì mép dưới thanh mới trùng mép dưới nhìn thấy của sheet và nội dung cuộn không lộ ra dưới nút.
 * Ở mức expanded (`hiddenBottom` 0) giữ `bottom: 0` như cũ.
 */
function barStyle(hiddenBottom: number): CSSProperties {
  if (hiddenBottom <= 0) return { bottom: 0 };
  return { bottom: `calc(${hiddenBottom}px - ${POPUP_BOTTOM_PADDING})` };
}

export function TimelineAddBar({ children }: TimelineAddBarProps) {
  const hiddenBottom = useContext(HiddenBottomContext);
  return (
    <div
      className="sticky bottom-0 border-t border-border bg-surface p-stack-md pb-[calc(var(--semantic-space-stack-md)+env(safe-area-inset-bottom))] transition-[bottom] duration-(--semantic-motion-duration-slow) ease-standard empty:hidden"
      style={barStyle(hiddenBottom)}
    >
      {children}
    </div>
  );
}
