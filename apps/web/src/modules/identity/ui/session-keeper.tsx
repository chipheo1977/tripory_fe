"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { PROACTIVE_LEAD_SEC } from "@tripory/identity";
import { refreshSession } from "@/composition/http.client";
import { isSecureCookieEnv, readAccessExpFromCookieString } from "@/composition/session-cookies";
import { sessionEvents } from "@/composition/session-events.client";

/** Hai lần chủ động liên tiếp có cùng `exp` cách nhau tối thiểu ngần này (Pitfall 4). */
const MIN_RETRY_SAME_EXP_MS = 60_000;

/**
 * Refresh chủ động trước hạn `PROACTIVE_LEAD_SEC` giây (Phase 2 D-15). Render `null`.
 *
 * Chỉ đọc cookie `at_exp` (một con số, không phải token) để hẹn giờ; quyết định có gọi BE hay không luôn do
 * route refresh (đồng hồ server). Mọi lời gọi đi qua `refreshSession()`, đường refresh duy nhất (Pitfall 3).
 */
export function SessionKeeper() {
  const pathname = usePathname();
  // Nhớ lần thử gần nhất theo `exp`: đồng hồ máy chạy nhanh làm timer nổ sớm, route no-op, cookie không đổi,
  // và không có mốc này timer sẽ nổ lại ngay thành vòng lặp.
  const lastAttempt = useRef<{ exp: number; at: number } | null>(null);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let disposed = false;
    let running = false;

    const readExp = () => readAccessExpFromCookieString(document.cookie, isSecureCookieEnv());

    const schedule = () => {
      clearTimeout(timer);
      // Đang refresh thì `run` sẽ tự hẹn lại khi xong.
      if (disposed || running) return;

      const exp = readExp();
      if (exp === null) return;

      const nowMs = Date.now();
      let delayMs = Math.max(0, (exp - PROACTIVE_LEAD_SEC) * 1000 - nowMs);
      const last = lastAttempt.current;

      if (last !== null && last.exp === exp) {
        delayMs = Math.max(delayMs, last.at + MIN_RETRY_SAME_EXP_MS - nowMs);
      }

      timer = setTimeout(() => void run(), delayMs);
    };

    const run = async () => {
      const exp = readExp();
      if (exp === null || disposed) return;

      lastAttempt.current = { exp, at: Date.now() };
      running = true;

      try {
        const outcome = await refreshSession();

        if (outcome === "expired") {
          running = false;
          sessionEvents.emitExpired();
          return;
        }
      } catch {
        // Lỗi tạm thời (mạng, 5xx, hết hạn xin khóa): im lặng và thử lại ở lần hẹn kế (D-20).
      }

      running = false;
      schedule();
    };

    // Timer bị trì hoãn khi máy ngủ hoặc tab nền, nên kiểm lại ngay khi tab hiện lại hoặc có mạng lại.
    const recheck = () => {
      if (document.visibilityState === "visible") schedule();
    };

    schedule();
    document.addEventListener("visibilitychange", recheck);
    window.addEventListener("online", schedule);

    return () => {
      disposed = true;
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", recheck);
      window.removeEventListener("online", schedule);
    };
    // `pathname` có chủ đích: đổi route thì đọc lại cookie, bắt `at_exp` mới sau đăng nhập.
  }, [pathname]);

  return null;
}
