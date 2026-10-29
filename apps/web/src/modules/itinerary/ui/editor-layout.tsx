"use client";

// Khung toàn màn của editor (UI-SPEC §Khung toàn màn, §Bố cục desktop, §Bố cục mobile/tablet; D-13..D-16).
//
// Bốn slot do container (04-21) điền:
//   - `header`:   EditorHeader (hoặc EditorHeaderMinimal).
//   - `timeline`: DayTabs + DaySubtitle + WaypointList + thanh "Thêm điểm đến".
//   - `canvas`:   vùng phải từ `lg`. Phase 4: `<TripSummary variant="canvas" />`. Phase 5 thay bằng bản đồ
//                 (summary chuyển lên đầu cột trái) mà không phải đổi các slot khác.
//   - `summary`:  nền phía sau sheet dưới `lg`. Phase 4: `<TripSummary variant="compact" />`.
//
// Từ `lg`: lưới hai cột `[var(--editor-timeline-width)_1fr]`, cột trái timeline, cột phải canvas; không có Sheet.
// Dưới `lg`: summary làm nền cuộn được; timeline nằm trong Sheet không modal, luôn mở, mức đầu "medium". Sheet nhận
// `insetTop` = chiều cao header đo bằng ResizeObserver nên không bao giờ che header ở cả ba mức snap (D-16).
// Sheet chỉ render khi `!wide` để trang bị Activity ẩn không để lại portal (RESEARCH A9).
import { Sheet, SheetContent, SheetTitle } from "@tripory/ui-web";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useMediaQuery } from "./use-media-query";

/** Trùng breakpoint `lg` của Tailwind (1024px). */
const LG_QUERY = "(min-width: 1024px)";

const TIMELINE_HEADING = "Lịch trình theo ngày";

export type EditorLayoutProps = Readonly<{
  header: ReactNode;
  timeline: ReactNode;
  canvas: ReactNode;
  summary: ReactNode;
}>;

export function EditorLayout({ header, timeline, canvas, summary }: EditorLayoutProps) {
  const wide = useMediaQuery(LG_QUERY);
  const headerRef = useRef<HTMLDivElement>(null);
  const [headerHeight, setHeaderHeight] = useState(0);

  useEffect(() => {
    const element = headerRef.current;
    if (element === null) return undefined;
    const observer = new ResizeObserver((entries) => {
      const entry = entries.at(-1);
      if (entry === undefined) return;
      // Làm tròn lên để Sheet không chồng lên phần lẻ pixel của header.
      setHeaderHeight(Math.ceil(entry.borderBoxSize?.[0]?.blockSize ?? entry.contentRect.height));
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="min-h-dvh bg-background text-text lg:h-dvh lg:overflow-hidden">
      {/* Bọc sticky để dưới `lg` (cuộn theo trang) header vẫn dính trên cùng và đo được cả viền, vùng an toàn. */}
      <div className="sticky top-0 z-sticky" ref={headerRef}>
        {header}
      </div>
      {wide ? (
        <div
          className="grid min-h-0 lg:grid-cols-[var(--editor-timeline-width)_1fr]"
          // Chiều cao theo header đo được thay vì biến CSS tự đặt (guard token 04-01 cấm biến mồ côi).
          style={{ height: `calc(100dvh - ${headerHeight}px)` }}
        >
          <div className="flex min-h-0 flex-col overflow-y-auto border-r border-border bg-surface">
            <h2 className="sr-only">{TIMELINE_HEADING}</h2>
            {timeline}
          </div>
          <div className="min-h-0 overflow-y-auto bg-background p-section">{canvas}</div>
        </div>
      ) : (
        <>
          {/* Chừa chỗ bằng đúng mức peek để nội dung cuối của summary không bị sheet che. */}
          <div className="pb-(--sheet-snap-peek)">{summary}</div>
          <Sheet defaultSnap="medium" dismissible={false} insetTop={headerHeight} modal={false} open>
            <SheetContent>
              <SheetTitle className="sr-only">{TIMELINE_HEADING}</SheetTitle>
              {timeline}
            </SheetContent>
          </Sheet>
        </>
      )}
    </div>
  );
}
