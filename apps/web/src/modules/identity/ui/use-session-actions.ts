"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { toSafeNextPath, type Viewer } from "@tripory/identity";
import { identityKeys } from "@tripory/identity/react";
import { notify } from "@tripory/ui-web";
import { identity } from "@/composition/identity.client";
import { sessionEvents } from "@/composition/session-events.client";

/** Đích sau đăng nhập/đăng ký khi không có `next` hợp lệ (D-03). */
export const DEFAULT_AFTER_SIGN_IN = "/itineraries/mine";

export type AfterSignInInput = Readonly<{
  viewer: Viewer;
  /** Giá trị `?next=` thô từ URL; luôn đi qua `toSafeNextPath` trước khi vào router. */
  next: string | null | undefined;
  /** Nội dung toast thành công, ví dụ "Chào mừng, {tên}" (D-07). */
  toast: string;
}>;

// Gom điều hướng và đồng bộ tab của vòng đời phiên một chỗ (D-03, D-18, D-21, D-22).
//
// Về Activity: với Cache Components, App Router giữ state của Client Component qua điều hướng, nên quay lại
// `/login` sau khi đăng xuất có thể còn giá trị form cũ. Vì vậy mọi hàm ở đây đều kèm `queryClient.clear()`,
// còn form (plan 03-12) tự `reset()` trong `onSuccess`.
export function useSessionActions() {
  const router = useRouter();
  const queryClient = useQueryClient();

  // `onSuccess` đặt ở mức hook (không phải `mutate(..., { onSuccess })`): callback của `mutate` bị bỏ khi
  // component gọi nó đã unmount, mà menu người dùng đóng ngay khi bấm "Đăng xuất".
  const logout = identity.useLogout({
    onSuccess: async () => {
      await sessionEvents.runLogoutHandlers();
      sessionEvents.announce("logged-out");
      queryClient.clear();
      // Đích là hằng, không lấy từ URL. Không toast (D-21).
      router.replace("/");
      router.refresh();
    },
  });
  const { mutate: runLogout, isPending: isSigningOut } = logout;

  const afterSignIn = useCallback(
    ({ viewer, next, toast }: AfterSignInInput) => {
      // Cache của tài khoản trước không được hiện cho tài khoản mới (T-03-54).
      queryClient.clear();
      queryClient.setQueryData(identityKeys.me, viewer);
      sessionEvents.rearmExpired();
      sessionEvents.announce("logged-in");
      // Chỉ chuỗi đã qua toSafeNextPath hoặc hằng mới vào router (T-03-51; docs use-router: `javascript:` sẽ chạy).
      router.replace(toSafeNextPath(next) ?? DEFAULT_AFTER_SIGN_IN);
      router.refresh();
      // Toast sau điều hướng: <Toast /> nằm ở root layout nên không bị unmount.
      notify.success(toast);
    },
    [queryClient, router],
  );

  const signOut = useCallback(() => {
    runLogout();
  }, [runLogout]);

  // D-18: route đổi mật khẩu đã xóa cookie ở server nên không gọi logout nữa.
  const afterPasswordChanged = useCallback(async () => {
    await sessionEvents.runLogoutHandlers();
    sessionEvents.announce("logged-out");
    queryClient.clear();
    sessionEvents.rearmExpired();
    router.replace("/login");
    notify.success("Đã đổi mật khẩu, vui lòng đăng nhập lại");
  }, [queryClient, router]);

  return { afterSignIn, signOut, afterPasswordChanged, isSigningOut } as const;
}
