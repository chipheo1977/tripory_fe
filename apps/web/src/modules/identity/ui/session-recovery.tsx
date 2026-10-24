"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ErrorState } from "@tripory/ui-web";
import { refreshSession } from "@/composition/http.client";
import { sessionEvents } from "@/composition/session-events.client";

export type SessionRecoveryProps = Readonly<{
  /** Hiện trong lúc chờ refresh (gate truyền skeleton của `(dashboard)`). */
  fallback: ReactNode;
}>;

/**
 * Hồi phục im lặng khi mở hoặc reload trang đúng lúc access token vừa hết hạn mà refresh token còn (D-24).
 * RSC không refresh được, nên client chạy `refreshSession()` (đường duy nhất, Pitfall 3) rồi `router.refresh()`.
 *
 * - Hết phiên thật (`'expired'`) → `emitExpired()`, `SessionEffects` chuyển sang /login (D-20).
 * - Lỗi tạm thời → `ErrorState` + "Thử lại"; KHÔNG đăng xuất, cookie giữ nguyên (D-20).
 */
export function SessionRecovery({ fallback }: SessionRecoveryProps) {
  const router = useRouter();
  const [state, setState] = useState<"working" | "failed">("working");
  const started = useRef(false);

  const attempt = useCallback(() => {
    refreshSession().then(
      (outcome) => {
        if (outcome === "refreshed") router.refresh();
        else sessionEvents.emitExpired();
      },
      () => setState("failed"),
    );
  }, [router]);

  useEffect(() => {
    // StrictMode chạy effect hai lần ở dev; ref giữ nguyên giữa hai lần nên chỉ gọi một lượt.
    if (started.current) return;
    started.current = true;
    attempt();
  }, [attempt]);

  const retry = () => {
    setState("working");
    attempt();
  };

  return state === "working" ? fallback : <ErrorState onRetry={retry} variant="page" />;
}
