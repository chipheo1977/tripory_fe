import type { ReactNode } from "react";
import { decideDashboardGate } from "@/composition/server/dashboard-gate";
import { getSessionKind } from "@/composition/viewer.server";
import { LoginRedirect } from "./login-redirect";
import { SessionRecovery } from "./session-recovery";

export type DashboardSessionGateProps = Readonly<{
  children: ReactNode;
  /** Skeleton của `(dashboard)`, hiện lúc `SessionRecovery` chờ refresh. Truyền qua prop để module không import ngược `app/`. */
  loading: ReactNode;
}>;

/**
 * Lưới an toàn phiên của layout `(dashboard)` (D-10, D-24, D-25). `proxy.ts` là lớp lạc quan thứ nhất (không
 * thấy route group), gate này là lớp thứ hai: bắt route `(dashboard)` mới quên khai báo prefix và xử lý trường
 * hợp có cookie nhưng access token đã hết hạn.
 *
 * - `none` → `LoginRedirect` (về /login?next=).
 * - `stale | invalid` → `SessionRecovery` (client refresh im lặng rồi `router.refresh()`).
 * - `fresh` → render trang.
 *
 * Đây là kiểm tra UX, không phải ranh giới bảo mật: dữ liệu thật vẫn đi qua BFF/BE xác thực Bearer (T-03-64).
 * Layout không chạy lại khi điều hướng phía client, nên phiên hết hạn giữa chừng do `SessionKeeper` và cơ chế
 * refresh khi gặp 401 xử lý. Phải đặt trong `<Suspense>` vì đọc cookie.
 */
export async function DashboardSessionGate({ children, loading }: DashboardSessionGateProps) {
  const kind = await getSessionKind();

  switch (decideDashboardGate(kind)) {
    case "login":
      return <LoginRedirect />;
    case "recover":
      return <SessionRecovery fallback={loading} />;
    case "render":
      return <>{children}</>;
  }
}
