"use client";

// Khung cột timeline của editor (UI-SPEC §Editor, §Bố cục desktop): thanh tab ở trên, thân tab ở dưới.
// Nằm trong cột trái từ `lg` hoặc trong Sheet dưới `lg`; không biết tab nào đang chọn: thân là `DayPanel` (tab ngày) hoặc
// `OverviewPanel` (tab Tổng quan) do editor ghép vào. Nơi chứa báo qua `TimelineHostProvider` (không có = cột trái).
//
// Cột trái: cột cha cuộn, thanh tab `sticky top-0`.
// Trong Sheet: thanh tab đứng yên ngay dưới tay cầm, CHỈ thân tab cuộn và là vùng cuộn dọc duy nhất (popup không cuộn).
// Vùng đó cao đúng phần nhìn thấy của sheet (trừ `hiddenBottom`), nên thanh "Thêm điểm đến" `sticky bottom-0` luôn sát đáy
// màn hình và mục cuối cuộn tới được. Ở mức peek vùng không cuộn (`scrollable` false) và về đầu.
import { cn } from "@tripory/ui-web";
import { createContext, useContext, useEffect, useRef, type ReactNode } from "react";

export type TimelineHost = Readonly<{
  /** Phần đáy popup đang nằm dưới mép màn hình (px), xem `sheetHiddenBottomPx`. */
  hiddenBottom: number;
  /** `false` ở mức peek: nội dung không cuộn được. */
  scrollable: boolean;
}>;

const TimelineHostContext = createContext<TimelineHost | null>(null);

/** `EditorLayout` bọc timeline bằng provider này khi đặt trong Sheet. */
export const TimelineHostProvider = TimelineHostContext.Provider;

export type TimelinePanelProps = Readonly<{
  /** `DayTabs`. */
  tabs: ReactNode;
  /** Đổi giá trị này (ví dụ tab đang chọn) thì vùng cuộn trong Sheet về đầu. */
  scrollResetKey?: string | number;
  children: ReactNode;
}>;

const SCROLL_CLASS = {
  scrollable: "overflow-y-auto",
  locked: "overflow-y-hidden",
} as const;

type SheetTimelineProps = Readonly<{ host: TimelineHost; tabs: ReactNode; scrollResetKey: string | number; children: ReactNode }>;

function SheetTimeline({ host, tabs, scrollResetKey, children }: SheetTimelineProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const { hiddenBottom, scrollable } = host;

  // Về đầu khi vào mức không cuộn được hoặc đổi tab; đồng bộ với DOM, không phải state.
  useEffect(() => {
    if (scrollerRef.current !== null) scrollerRef.current.scrollTop = 0;
  }, [scrollable, scrollResetKey]);

  return (
    <>
      <div className="shrink-0 border-b border-border bg-surface">{tabs}</div>
      {/* Wrapper không có nội dung theo luồng: vùng cuộn tuyệt đối nên Content của Sheet không bị nới cao hơn phần nhìn thấy. */}
      <div className="relative min-h-0 flex-1">
        <div
          // Vuốt trong vùng này chỉ cuộn nội dung, không kéo sheet; kéo sheet bằng tay cầm hoặc hàng tab.
          className={cn(
            "absolute inset-x-0 top-0 touch-pan-y overscroll-contain transition-[bottom] duration-(--semantic-motion-duration-slow) ease-standard",
            scrollable ? SCROLL_CLASS.scrollable : SCROLL_CLASS.locked,
          )}
          data-base-ui-swipe-ignore=""
          data-timeline-scroller=""
          ref={scrollerRef}
          style={{ bottom: hiddenBottom }}
        >
          <div className="flex min-h-full flex-col">{children}</div>
        </div>
      </div>
    </>
  );
}

export function TimelinePanel({ tabs, scrollResetKey = 0, children }: TimelinePanelProps) {
  const host = useContext(TimelineHostContext);
  if (host !== null) {
    return (
      <SheetTimeline host={host} scrollResetKey={scrollResetKey} tabs={tabs}>
        {children}
      </SheetTimeline>
    );
  }
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <div className="sticky top-0 z-sticky border-b border-border bg-surface">{tabs}</div>
      {children}
    </div>
  );
}
