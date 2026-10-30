"use client";

import { Button, Sheet, SheetContent, SheetTitle } from "@tripory/ui-web";
import { ChevronUp } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useMediaQuery } from "./use-media-query";

/** Trùng breakpoint `lg` của Tailwind (1024px). */
const LG_QUERY = "(min-width: 1024px)";

const TIMELINE_HEADING = "Lịch trình theo ngày";
const TIMELINE_REOPEN_LABEL = "Lịch trình";

export type EditorLayoutProps = Readonly<{
  header: ReactNode;
  timeline: ReactNode;
  canvas: ReactNode;
  summary: ReactNode;
}>;

type WideBodyProps = Readonly<{ timeline: ReactNode; canvas: ReactNode; headerHeight: number }>;

function WideBody({ timeline, canvas, headerHeight }: WideBodyProps) {
  return (
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
  );
}

type ReopenChipProps = Readonly<{ timelineOpen: boolean; onReopen: () => void }>;

/** Vuốt xuống hết từ mức thấp đóng sheet; chip này là đường duy nhất để mở lại, nên luôn có mặt khi sheet đóng. */
function ReopenChip({ timelineOpen, onReopen }: ReopenChipProps) {
  if (timelineOpen) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-modal flex justify-center pb-[calc(var(--semantic-space-stack-md)+env(safe-area-inset-bottom))]">
      <Button className="pointer-events-auto shadow-overlay" icon={ChevronUp} onClick={onReopen} variant="secondary">
        {TIMELINE_REOPEN_LABEL}
      </Button>
    </div>
  );
}

type NarrowBodyProps = Readonly<{ timeline: ReactNode; summary: ReactNode; headerHeight: number }>;

function NarrowBody({ timeline, summary, headerHeight }: NarrowBodyProps) {
  const [timelineOpen, setTimelineOpen] = useState(true);
  return (
    <>
      {/* Chừa chỗ bằng đúng mức peek để nội dung cuối của summary không bị sheet che. */}
      <div className="pb-(--sheet-snap-peek)">{summary}</div>
      <Sheet defaultSnap="medium" insetTop={headerHeight} modal={false} onOpenChange={setTimelineOpen} open={timelineOpen}>
        <SheetContent fillSnap>
          <SheetTitle className="sr-only">{TIMELINE_HEADING}</SheetTitle>
          {timeline}
        </SheetContent>
      </Sheet>
      <ReopenChip onReopen={() => setTimelineOpen(true)} timelineOpen={timelineOpen} />
    </>
  );
}

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

  function renderBody() {
    if (wide) return <WideBody canvas={canvas} headerHeight={headerHeight} timeline={timeline} />;
    return <NarrowBody headerHeight={headerHeight} summary={summary} timeline={timeline} />;
  }

  return (
    <div className="min-h-dvh bg-background text-text lg:h-dvh lg:overflow-hidden">
      {/* Bọc sticky để dưới `lg` (cuộn theo trang) header vẫn dính trên cùng và đo được cả viền, vùng an toàn. */}
      <div className="sticky top-0 z-sticky" ref={headerRef}>
        {header}
      </div>
      {renderBody()}
    </div>
  );
}
