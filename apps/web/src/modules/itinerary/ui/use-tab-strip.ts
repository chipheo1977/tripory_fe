"use client";

// Hàng tab cuộn ngang không thanh cuộn: cảm ứng vuốt tự nhiên, chuột kéo-thả (chặn click sau khi kéo để không chọn nhầm tab),
// biết còn tab bị cắt ở mép nào (để vẽ mờ dần), và cuộn một tab vào vùng nhìn theo `prefers-reduced-motion`.
import { useCallback, useEffect, useRef, useState, type MouseEvent, type PointerEvent, type RefObject, type UIEvent } from "react";
import { prefersReducedMotion } from "./map/map-camera";

/** Quãng chuột phải di chuyển (px) mới tính là kéo; dưới ngưỡng vẫn là click bình thường. */
// (Ngưỡng nhỏ để chạm nhẹ không bị coi là kéo.)
export const DRAG_THRESHOLD_PX = 4;
const EDGE_TOLERANCE_PX = 1;
const TAB_SELECTOR = '[role="tab"]';

export type StripEdges = Readonly<{ start: boolean; end: boolean }>;

type StripMetrics = Readonly<{ scrollLeft: number; clientWidth: number; scrollWidth: number }>;

/** Còn nội dung bị cắt ở đầu/cuối hàng. Hàm thuần. */
export function stripEdgesOf({ scrollLeft, clientWidth, scrollWidth }: StripMetrics): StripEdges {
  return {
    start: scrollLeft > EDGE_TOLERANCE_PX,
    end: scrollLeft + clientWidth < scrollWidth - EDGE_TOLERANCE_PX,
  };
}

type DragState = { startX: number; startScroll: number; pointerId: number; active: boolean };

export type TabStripProps = Readonly<{
  ref: RefObject<HTMLDivElement | null>;
  onMouseDown(event: MouseEvent<HTMLDivElement>): void;
  onPointerDown(event: PointerEvent<HTMLDivElement>): void;
  onPointerMove(event: PointerEvent<HTMLDivElement>): void;
  onPointerUp(event: PointerEvent<HTMLDivElement>): void;
  onPointerCancel(event: PointerEvent<HTMLDivElement>): void;
  onClickCapture(event: UIEvent<HTMLDivElement>): void;
  onScroll(): void;
}>;

export type TabStrip = Readonly<{
  stripProps: TabStripProps;
  edges: StripEdges;
  /** Cuộn tab vào vùng nhìn (gần nhất, chừa lề của `scroll-padding`); không hoạt ảnh khi giảm chuyển động. */
  scrollTabIntoView(tab: HTMLElement): void;
}>;

export function useTabStrip(): TabStrip {
  const ref = useRef<HTMLDivElement | null>(null);
  const drag = useRef<DragState | null>(null);
  const suppressClick = useRef(false);
  const [edges, setEdges] = useState<StripEdges>({ start: false, end: false });

  const refreshEdges = useCallback(() => {
    const strip = ref.current;
    if (strip === null) return;
    const next = stripEdgesOf(strip);
    setEdges((previous) => (previous.start === next.start && previous.end === next.end ? previous : next));
  }, []);

  // Đổi kích thước khung hoặc số tab (độ rộng nội dung) cũng làm đổi mép bị cắt.
  useEffect(() => {
    const strip = ref.current;
    if (strip === null || typeof ResizeObserver === "undefined") return undefined;
    const observer = new ResizeObserver(refreshEdges);
    observer.observe(strip);
    if (strip.firstElementChild !== null) observer.observe(strip.firstElementChild);
    return () => observer.disconnect();
  }, [refreshEdges]);

  // Base UI chọn tab ngay khi nhấn chuột (focus bằng nút chính), nên kéo bắt đầu trên một tab sẽ chọn tab đó. Chặn focus
  // do nhấn chuột trên tab; click vẫn chọn như thường, và `endDrag` tự focus tab khi đó là một cú nhấp (không phải kéo).
  const onMouseDown = useCallback((event: MouseEvent<HTMLDivElement>) => {
    if (event.button !== 0 || !(event.target instanceof Element) || event.target.closest(TAB_SELECTOR) === null) return;
    event.preventDefault();
  }, []);

  const onPointerDown = useCallback((event: PointerEvent<HTMLDivElement>) => {
    const strip = ref.current;
    if (strip === null || event.pointerType !== "mouse" || event.button !== 0) return;
    drag.current = { startX: event.clientX, startScroll: strip.scrollLeft, pointerId: event.pointerId, active: false };
  }, []);

  const onPointerMove = useCallback((event: PointerEvent<HTMLDivElement>) => {
    const strip = ref.current;
    const state = drag.current;
    if (strip === null || state === null || state.pointerId !== event.pointerId) return;
    const delta = event.clientX - state.startX;
    if (!state.active) {
      if (Math.abs(delta) < DRAG_THRESHOLD_PX) return;
      state.active = true;
      strip.setPointerCapture(event.pointerId);
    }
    strip.scrollLeft = state.startScroll - delta;
  }, []);

  const endDrag = useCallback((event: PointerEvent<HTMLDivElement>) => {
    const strip = ref.current;
    const state = drag.current;
    drag.current = null;
    if (strip === null || state === null) return;
    if (!state.active) {
      // Nhấp không kéo: trả focus cho tab dưới con trỏ (mousedown đã chặn focus mặc định) để bàn phím đi tiếp từ đó.
      if (event.target instanceof Element) event.target.closest<HTMLElement>(TAB_SELECTOR)?.focus();
      return;
    }
    strip.releasePointerCapture(event.pointerId);
    // `click` tới ngay sau `pointerup`: bỏ qua nó để kéo xong không chọn nhầm tab dưới con trỏ.
    suppressClick.current = true;
    setTimeout(() => {
      suppressClick.current = false;
    }, 0);
  }, []);

  const onClickCapture = useCallback((event: UIEvent<HTMLDivElement>) => {
    if (!suppressClick.current) return;
    event.preventDefault();
    event.stopPropagation();
  }, []);

  const scrollTabIntoView = useCallback((tab: HTMLElement) => {
    tab.scrollIntoView({ inline: "nearest", block: "nearest", behavior: prefersReducedMotion() ? "auto" : "smooth" });
  }, []);

  return {
    stripProps: { ref, onMouseDown, onPointerDown, onPointerMove, onPointerUp: endDrag, onPointerCancel: endDrag, onClickCapture, onScroll: refreshEdges },
    edges,
    scrollTabIntoView,
  };
}
