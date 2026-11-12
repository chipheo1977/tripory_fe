"use client";

// Dải chip ngày dính dưới khối dính của trang công khai (D-06, UI-SPEC §DayChipStrip). Mỗi chip là liên kết `#ngay-N` dùng
// được bằng Tab/Enter; bấm thì chặn hành vi mặc định (không đổi hash, không thêm mục lịch sử) và để nơi gọi cuộn tới mục ngày.
// Chip của ngày đang đọc có `aria-current`, weight 600, viền/nền primary. Mờ dần ở mép còn chip bị cắt.
import { dayColorIndex } from "@tripory/itinerary";
import { cn, MapToneDot } from "@tripory/ui-web";
import { useEffect, useRef, type Ref } from "react";
import { EdgeFade } from "./edge-fade";
import { prefersReducedMotion } from "./map/map-camera";
import { dayAnchorId } from "./public-format";
import { useTabStrip } from "./use-tab-strip";

export type DayChipStripProps = Readonly<{
  visible: boolean;
  dayNumbers: readonly number[];
  activeDay: number;
  /** Chiều cao (px) của khối dính phía trên; dải này dính ngay dưới nó. */
  stickyTop: number;
  onSelect(dayNumber: number): void;
  /** Để nơi gọi đo chiều cao dải (cộng vào `scroll-margin-top` của mục ngày). */
  stripRef?: Ref<HTMLElement>;
}>;

const CHIP_STATE = {
  idle: "border-border bg-surface font-regular text-text hover:bg-surface-muted",
  active: "border-primary bg-primary-subtle font-semibold text-text",
} as const;

type DayChipProps = Readonly<{
  dayNumber: number;
  active: boolean;
  onSelect(dayNumber: number): void;
  chipRef(element: HTMLAnchorElement | null): void;
}>;

function DayChip({ dayNumber, active, onSelect, chipRef }: DayChipProps) {
  return (
    <a
      aria-current={active ? "true" : undefined}
      className={cn(
        "inline-flex min-h-touch shrink-0 items-center gap-inline-xs rounded-pill border px-stack-md text-label focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring",
        CHIP_STATE[active ? "active" : "idle"],
      )}
      href={`#${dayAnchorId(dayNumber)}`}
      onClick={(event) => {
        event.preventDefault();
        onSelect(dayNumber);
      }}
      ref={chipRef}
    >
      <MapToneDot tone={dayColorIndex(dayNumber)} />
      Ngày {dayNumber}
    </a>
  );
}

export function DayChipStrip({ visible, dayNumbers, activeDay, stickyTop, onSelect, stripRef }: DayChipStripProps) {
  const { stripProps, edges } = useTabStrip();
  const chips = useRef(new Map<number, HTMLAnchorElement>());
  const mounted = useRef(false);

  // Cuộn chip đang đọc vào khung; bỏ qua lần mount đầu để trang không tự cuộn ngang lúc mở.
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    chips.current.get(activeDay)?.scrollIntoView?.({
      inline: "nearest",
      block: "nearest",
      behavior: prefersReducedMotion() ? "auto" : "smooth",
    });
  }, [activeDay]);

  if (!visible) return null;
  return (
    <nav aria-label="Các ngày trong lịch trình" className="sticky z-sticky border-b border-border bg-surface" ref={stripRef} style={{ top: stickyTop }}>
      <div className="relative mx-auto w-full max-w-content-md">
        <div
          {...stripProps}
          className="flex gap-inline-sm overflow-x-auto overscroll-x-contain px-page-inline py-inline-sm [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {dayNumbers.map((dayNumber) => (
            <DayChip
              active={dayNumber === activeDay}
              chipRef={(element) => {
                if (element === null) chips.current.delete(dayNumber);
                else chips.current.set(dayNumber, element);
              }}
              dayNumber={dayNumber}
              key={dayNumber}
              onSelect={onSelect}
            />
          ))}
        </div>
        <EdgeFade side="start" visible={edges.start} />
        <EdgeFade side="end" visible={edges.end} />
      </div>
    </nav>
  );
}
