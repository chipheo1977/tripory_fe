"use client";
// cuộn tới khối bình luận và focus tiêu đề khi người dùng bấm "Xem bình luận" ở Tổng quan (D-21, RESEARCH R6).
// bài viết có thể đang `hidden` (chế độ Bản đồ) nên thăm dò mỗi khung hình tới khi hiện, tối đa `MAX_FRAMES`.
// hook gói `document`/`window` để component không chạm DOM (coding-rules D). không setState trong effect.
import { useCallback, useEffect, useRef } from "react";

const MAX_FRAMES = 30;

// đọc lúc cuộn, không cache lúc mount.
const reduced = (): boolean =>
  typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const focusElement = (id: string): void => {
  document.getElementById(id)?.focus({ preventScroll: true });
};

export type CommentsFocusInput = Readonly<{ token: number; sectionId: string; headingId: string }>;

export function useCommentsFocus({ token, sectionId, headingId }: CommentsFocusInput) {
  const handled = useRef(0);

  useEffect(() => {
    if (token === 0 || token === handled.current) return;
    handled.current = token;
    let frames = 0;
    let frame = 0;
    const attempt = () => {
      const section = document.getElementById(sectionId);
      const shown = section !== null && section.closest("[hidden]") === null;
      if (shown) {
        section.scrollIntoView?.({ block: "start", behavior: reduced() ? "auto" : "smooth" });
        focusElement(headingId);
        return;
      }
      frames += 1;
      if (frames > MAX_FRAMES) return;
      frame = requestAnimationFrame(attempt);
    };
    frame = requestAnimationFrame(attempt);
    return () => cancelAnimationFrame(frame);
  }, [token, sectionId, headingId]);

  const focusById = useCallback((id: string) => focusElement(id), []);
  const focusHeading = useCallback(() => focusElement(headingId), [headingId]);
  return { focusById, focusHeading };
}
