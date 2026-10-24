import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginForm } from "@/modules/identity/ui/login-form";

export const metadata: Metadata = { title: "Đăng nhập" };

export default function LoginPage() {
  // LoginForm đọc `?next=` bằng useSearchParams nên phải nằm trong Suspense (docs use-search-params).
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
