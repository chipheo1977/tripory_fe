"use client";

// Theo dõi ngày đang đọc và nhảy tới mục ngày của chế độ Bài viết (D-06). Là hook để component không gọi trực tiếp
// `document`/`window`/`IntersectionObserver`. Không đổi `location.hash` và không thêm mục lịch sử: lịch sử chỉ dành cho
// chế độ Bài viết/Bản đồ (D-08).
//
// - Ngày đang đọc: `IntersectionObserver` với `rootMargin` chừa khối dính phía trên và 60% đáy; lấy ngày nhỏ nhất đang
//   giao vùng, không mục nào giao thì giữ ngày trước, cuộn chạm đáy trang thì là ngày cuối.
// - `goToDay`: cuộn tới mục ngày (không hoạt ảnh khi `prefers-reduced-motion`, đọc lúc bấm), tô chip ngay và "ghim" tới khi
//   cuộn xong (`scrollend` hoặc 1000ms) để chip không nhảy qua các ngày trung gian, rồi focus `h2` của ngày.
import { useCallback, useEffect, useRef, useState } from "react";
import { nextActiveDay } from "./active-day";
import { prefersReducedMotion } from "./map/map-camera";
import { dayAnchorId } from "./public-format";

/** Ghim tối đa 1000ms: trình duyệt không có `scrollend` (Safari cũ) vẫn nhả ghim. */
const PIN_MAX_MS = 1000;
const BOTTOM_TOLERANCE_PX = 2;
const DAY_ID_PATTERN = /^ngay-(\d+)$/;

export type DayNavigation = Readonly<{
  activeDay: number;
  goToDay(day: number): void;
}>;

type Input = Readonly<{
  dayNumbers: readonly number[];
  /** Chiều cao khối dính + dải chip (px); mục ngày chỉ tính là "đang đọc" khi vượt phía dưới nó. */
  topOffset: number;
  enabled: boolean;
}>;

function dayOfEntry(entry: IntersectionObserverEntry): number | null {
  const match = DAY_ID_PATTERN.exec(entry.target.id);
  if (match === null) return null;
  return Number(match[1]);
}

const isAtBottom = (): boolean =>
  window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - BOTTOM_TOLERANCE_PX;

export function useDayNavigation({ dayNumbers, topOffset, enabled }: Input): DayNavigation {
  const [activeDay, setActiveDay] = useState(dayNumbers[0] ?? 1);
  const intersecting = useRef(new Set<number>());
  const pinned = useRef(false);
  const releasePin = useRef<(() => void) | null>(null);
  const lastDay = dayNumbers.length === 0 ? 1 : Math.max(...dayNumbers);
  const dayKey = dayNumbers.join(",");

  useEffect(() => {
    if (!enabled || typeof IntersectionObserver === "undefined") return undefined;
    const days = dayKey === "" ? [] : dayKey.split(",").map(Number);
    const seen = intersecting.current;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const day = dayOfEntry(entry);
          if (day === null) continue;
          if (entry.isIntersecting) seen.add(day);
          else seen.delete(day);
        }
        if (pinned.current) return;
        setActiveDay((previous) => nextActiveDay({ previous, intersecting: seen, atBottom: false, lastDay }));
      },
      { rootMargin: `-${topOffset}px 0px -60% 0px` },
    );
    for (const day of days) {
      const section = document.getElementById(dayAnchorId(day));
      if (section !== null) observer.observe(section);
    }
    const onScroll = () => {
      if (!pinned.current && isAtBottom()) setActiveDay(lastDay);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", onScroll);
      seen.clear();
    };
  }, [enabled, topOffset, dayKey, lastDay]);

  // Nhả ghim còn treo khi component bị gỡ.
  useEffect(() => () => releasePin.current?.(), []);

  const goToDay = useCallback((day: number) => {
    const section = document.getElementById(dayAnchorId(day));
    if (section === null) return;
    releasePin.current?.();
    pinned.current = true;
    setActiveDay(day);
    section.scrollIntoView?.({ block: "start", behavior: prefersReducedMotion() ? "auto" : "smooth" });
    section.querySelector<HTMLElement>("h2")?.focus({ preventScroll: true });
    const timer = setTimeout(() => releasePin.current?.(), PIN_MAX_MS);
    const release = () => {
      pinned.current = false;
      clearTimeout(timer);
      window.removeEventListener("scrollend", release);
      releasePin.current = null;
    };
    releasePin.current = release;
    window.addEventListener("scrollend", release, { once: true });
  }, []);

  return { activeDay, goToDay };
}
