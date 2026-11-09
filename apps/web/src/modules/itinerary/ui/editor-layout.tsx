"use client";

import { Button, Sheet, SheetContent, SheetTitle } from "@tripory/ui-web";
import { ChevronUp } from "lucide-react";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import {
  narrowViewport,
  sheetHiddenBottomPx,
  wideViewport,
  type MapFrame,
  type SheetSnapName,
  type SheetSnapRequest,
} from "./editor-map-viewport";
import { TimelineHostProvider } from "./timeline-panel";
import { useMediaQuery } from "./use-media-query";

/** Trùng breakpoint `lg` của Tailwind (1024px). */
const LG_QUERY = "(min-width: 1024px)";
const TIMELINE_HEADING = "Lịch trình theo ngày";
const TIMELINE_REOPEN_LABEL = "Lịch trình";
/** Cùng giá trị mặc định của `Sheet` trước khi đo được viewport (SSR). */
const SERVER_VIEWPORT_HEIGHT = 640;

export type EditorLayoutProps = Readonly<{
  header: ReactNode;
  timeline: ReactNode;
  /** Một slot bản đồ cho cả desktop và nền mobile; `frame` cho biết bố cục và vùng an toàn (D-118, D-119). */
  map(frame: MapFrame): ReactNode;
  /** Bấm pin dưới `lg`: đưa sheet về mức đó, mở lại nếu đang đóng (D-125). Mỗi `seq` chỉ áp một lần. */
  sheetSnapRequest?: SheetSnapRequest | null;
}>;

type WideBodyProps = Readonly<{ timeline: ReactNode; map: EditorLayoutProps["map"]; headerHeight: number }>;

function WideBody({ timeline, map, headerHeight }: WideBodyProps) {
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
      <div className="relative isolate min-h-0 overflow-hidden bg-background">{map({ wide: true, viewport: wideViewport() })}</div>
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

const subscribeViewportHeight = (notify: () => void): (() => void) => {
  window.addEventListener("resize", notify);
  return () => window.removeEventListener("resize", notify);
};
const readViewportHeight = (): number => window.innerHeight;
const readServerViewportHeight = (): number => SERVER_VIEWPORT_HEIGHT;

function useViewportHeight(): number {
  return useSyncExternalStore(subscribeViewportHeight, readViewportHeight, readServerViewportHeight);
}

type NarrowBodyProps = Readonly<{
  timeline: ReactNode;
  map: EditorLayoutProps["map"];
  headerHeight: number;
  sheetSnapRequest: SheetSnapRequest | null;
}>;

function NarrowBody({ timeline, map, headerHeight, sheetSnapRequest }: NarrowBodyProps) {
  const [timelineOpen, setTimelineOpen] = useState(true);
  const [snap, setSnap] = useState<SheetSnapName>("medium");
  // Yêu cầu có sẵn lúc mount (đã áp trước khi đổi bố cục) không áp lại; chỉ `seq` mới mới có hiệu lực.
  const [appliedSeq, setAppliedSeq] = useState<number | null>(sheetSnapRequest?.seq ?? null);
  const viewportHeight = useViewportHeight();

  if (sheetSnapRequest !== null && sheetSnapRequest.seq !== appliedSeq) {
    setAppliedSeq(sheetSnapRequest.seq);
    setTimelineOpen(true);
    setSnap(sheetSnapRequest.snap);
  }

  const reopen = useCallback(() => {
    setSnap("medium");
    setTimelineOpen(true);
  }, []);
  const sheetInput = { open: timelineOpen, snap, viewportHeight, headerHeight };
  const viewport = narrowViewport(sheetInput);
  const timelineHost = { hiddenBottom: sheetHiddenBottomPx(sheetInput), scrollable: snap !== "peek" };

  return (
    <>
      {/* Bản đồ là nền cố định từ đáy header tới đáy viewport; sheet phủ lên và `viewport` chừa phần bị che. */}
      <div className="fixed inset-x-0 bottom-0" style={{ top: headerHeight }}>
        {map({ wide: false, viewport })}
      </div>
      <Sheet
        defaultSnap="medium"
        insetTop={headerHeight}
        modal={false}
        onOpenChange={setTimelineOpen}
        onSnapChange={setSnap}
        open={timelineOpen}
        snap={snap}
      >
        {/* `pb-0`: đáy popup không đệm để thanh "Thêm điểm đến" dính sát đáy màn hình; vùng an toàn nằm trong thanh.
            `overflow-y-hidden`: popup không cuộn; vùng cuộn duy nhất là thân tab trong `TimelinePanel` (tay cầm và hàng tab đứng yên). */}
        <SheetContent className="overflow-y-hidden pb-0" fillSnap>
          <SheetTitle className="sr-only">{TIMELINE_HEADING}</SheetTitle>
          <TimelineHostProvider value={timelineHost}>{timeline}</TimelineHostProvider>
        </SheetContent>
      </Sheet>
      <ReopenChip onReopen={reopen} timelineOpen={timelineOpen} />
    </>
  );
}

export function EditorLayout({ header, timeline, map, sheetSnapRequest = null }: EditorLayoutProps) {
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
    if (wide) return <WideBody headerHeight={headerHeight} map={map} timeline={timeline} />;
    return <NarrowBody headerHeight={headerHeight} map={map} sheetSnapRequest={sheetSnapRequest} timeline={timeline} />;
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
