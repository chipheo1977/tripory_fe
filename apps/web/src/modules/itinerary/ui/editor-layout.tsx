"use client";

import { Button, Sheet, SheetContent, SheetTitle } from "@tripory/ui-web";
import { ChevronUp } from "lucide-react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
  type RefObject,
} from "react";
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

export type WideBodyProps = Readonly<{ timeline: ReactNode; map: EditorLayoutProps["map"]; headerHeight: number }>;

export function WideBody({ timeline, map, headerHeight }: WideBodyProps) {
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

type ReopenChipProps = Readonly<{ timelineOpen: boolean; onReopen: () => void; companion?: ReactNode }>;

/**
 * Vuốt xuống hết từ mức thấp đóng sheet; chip này là đường duy nhất để mở lại, nên luôn có mặt khi sheet đóng.
 * `companion` (trang công khai: viên thuốc chuyển chế độ) đứng cạnh chip trong cùng dải đáy. Lớp `z-sticky` để dải nổi
 * dưới scrim của Dialog/Sheet modal (UI-SPEC §Viên thuốc chuyển chế độ).
 */
function ReopenChip({ timelineOpen, onReopen, companion = null }: ReopenChipProps) {
  if (timelineOpen) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-sticky flex items-center justify-center gap-inline-sm pb-[calc(var(--semantic-space-stack-md)+env(safe-area-inset-bottom))]">
      <Button className="pointer-events-auto shadow-overlay" icon={ChevronUp} onClick={onReopen} variant="secondary">
        {TIMELINE_REOPEN_LABEL}
      </Button>
      {companion}
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

export type NarrowBodyProps = Readonly<{
  timeline: ReactNode;
  map: EditorLayoutProps["map"];
  headerHeight: number;
  sheetSnapRequest: SheetSnapRequest | null;
  /** Đứng cạnh chip "Lịch trình" khi sheet đóng (viên thuốc chuyển chế độ của trang công khai). */
  reopenCompanion?: ReactNode;
}>;

export function NarrowBody({ timeline, map, headerHeight, sheetSnapRequest, reopenCompanion = null }: NarrowBodyProps) {
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
      <ReopenChip companion={reopenCompanion} onReopen={reopen} timelineOpen={timelineOpen} />
    </>
  );
}

/**
 * Đo chiều cao của một khối dính bằng `ResizeObserver` (làm tròn lên để Sheet không chồng lên phần lẻ pixel).
 * Editor và trang công khai (Phase 5) cùng dùng; gắn `ref` vào khối cần đo.
 */
export function useHeaderHeight(): { ref: RefObject<HTMLDivElement | null>; height: number } {
  const ref = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(0);

  useEffect(() => {
    const element = ref.current;
    if (element === null) return undefined;
    const observer = new ResizeObserver((entries) => {
      const entry = entries.at(-1);
      if (entry === undefined) return;
      setHeight(Math.ceil(entry.borderBoxSize?.[0]?.blockSize ?? entry.contentRect.height));
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return { ref, height };
}

// `WideBody`, `NarrowBody` và `useHeaderHeight` được trang công khai dùng lại với khối dính tự đo (Phase 5).
export function EditorLayout({ header, timeline, map, sheetSnapRequest = null }: EditorLayoutProps) {
  const wide = useMediaQuery(LG_QUERY);
  const { ref: headerRef, height: headerHeight } = useHeaderHeight();

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
