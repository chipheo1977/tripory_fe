import type { Metadata } from "next";
import { ChangePasswordForm } from "@/modules/identity/ui/change-password-form";

export const metadata: Metadata = { title: "Đổi mật khẩu" };

// Nằm trong (dashboard): proxy.ts và gate của layout chặn khi chưa đăng nhập. Form không đọc searchParams
// hay cookie nên không cần Suspense.
export default function ChangePasswordPage() {
  return <ChangePasswordForm />;
}
