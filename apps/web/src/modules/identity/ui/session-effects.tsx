"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { toSafeNextPath } from "@tripory/identity";
import { notify } from "@tripory/ui-web";
import { sessionEvents } from "@/composition/session-events.client";
import { SESSION_EXPIRED_TOAST } from "@/lib/feedback";
import { DEFAULT_AFTER_SIGN_IN } from "./use-session-actions";

const AUTH_PAGES: ReadonlySet<string> = new Set(["/login", "/register"]);

/**
 * Nơi duy nhất nối sự kiện phiên (hết phiên ở tab này, đăng nhập/đăng xuất ở tab khác) vào router và toast
 * (D-20, D-22). Render `null`. Hành động của chính tab này (đăng nhập, đăng xuất, đổi mật khẩu) nằm ở
 * `useSessionActions`.
 */
export function SessionEffects() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const pathname = usePathname();
  const search = useSearchParams().toString();

  // Giữ vị trí hiện tại trong ref để đăng ký sự kiện đúng một lần (không gỡ/gắn lại mỗi lần đổi route).
  // Khai báo TRƯỚC effect đăng ký để ref luôn mới khi listener chạy.
  const location = useRef({ pathname, search });
  useEffect(() => {
    location.current = { pathname, search };
  });

  // Vào /login hoặc /register nghĩa là người dùng sắp đăng nhập lại: cho phép báo hết phiên lần sau.
  useEffect(() => {
    if (AUTH_PAGES.has(pathname)) sessionEvents.rearmExpired();
  }, [pathname]);

  useEffect(() => {
    const offExpired = sessionEvents.on("expired", () => {
      const current = location.current;

      // Pitfall 10: đang ở trang đăng nhập/đăng ký thì không chuyển trang và không toast.
      if (AUTH_PAGES.has(current.pathname)) return;

      void (async () => {
        await sessionEvents.runLogoutHandlers();
        queryClient.clear();

        // `next` qua toSafeNextPath rồi mới encode; không bao giờ đưa URL thô vào router (T-03-51).
        const here = `${current.pathname}${current.search === "" ? "" : `?${current.search}`}`;
        const next = toSafeNextPath(here);
        router.replace(next === null ? "/login" : `/login?next=${encodeURIComponent(next)}`);
        notify.info(SESSION_EXPIRED_TOAST);
      })();
    });

    const offLoggedOut = sessionEvents.on("remote-logged-out", () => {
      void sessionEvents.runLogoutHandlers().then(() => {
        // Điều hướng cứng là chủ đích: xóa sạch state của tab, D-22 không có toast nên không mất gì.
        // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- cố ý tải lại cứng
        window.location.assign("/");
      });
    });

    const offLoggedIn = sessionEvents.on("remote-logged-in", () => {
      queryClient.clear();

      const current = location.current;

      if (AUTH_PAGES.has(current.pathname)) {
        const raw = new URLSearchParams(current.search).get("next");
        router.replace(toSafeNextPath(raw) ?? DEFAULT_AFTER_SIGN_IN);
      } else {
        // Trang khác: render lại RSC để header nhận cookie mới.
        router.refresh();
      }
    });

    return () => {
      offExpired();
      offLoggedOut();
      offLoggedIn();
    };
  }, [queryClient, router]);

  return null;
}
