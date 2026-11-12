"use client";

// Sao chép link vào clipboard (D-13). Trả trạng thái, không có chuỗi hiển thị: copy thuộc về component. `copied` tự về
// `idle` sau 2000ms; `failed` giữ nguyên để nơi gọi hiện hướng dẫn chép tay, tới khi `reset()` hoặc lần `copy` kế tiếp.
import { useCallback, useEffect, useRef, useState } from "react";

export type CopyStatus = "idle" | "copied" | "failed";
export const COPIED_RESET_MS = 2000;

export function useCopyLink(): Readonly<{ status: CopyStatus; copy(text: string): Promise<void>; reset(): void }> {
  const [status, setStatus] = useState<CopyStatus>("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = useCallback(() => {
    if (timer.current === null) return;
    clearTimeout(timer.current);
    timer.current = null;
  }, []);

  useEffect(() => clearTimer, [clearTimer]);

  const copy = useCallback(
    async (text: string) => {
      clearTimer();
      try {
        // Không có `navigator.clipboard` (HTTP ngoài localhost) thì dòng này ném TypeError, rơi xuống `catch`.
        await navigator.clipboard.writeText(text);
        setStatus("copied");
        timer.current = setTimeout(() => setStatus("idle"), COPIED_RESET_MS);
      } catch {
        setStatus("failed");
      }
    },
    [clearTimer],
  );

  const reset = useCallback(() => {
    clearTimer();
    setStatus("idle");
  }, [clearTimer]);

  return { status, copy, reset };
}
