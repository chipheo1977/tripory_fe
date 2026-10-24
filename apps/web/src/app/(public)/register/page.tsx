import type { Metadata } from "next";
import { Suspense } from "react";
import { RegisterForm } from "@/modules/identity/ui/register-form";

export const metadata: Metadata = { title: "Tạo tài khoản" };

export default function RegisterPage() {
  // RegisterForm đọc `?next=` bằng useSearchParams nên phải nằm trong Suspense (docs use-search-params).
  return (
    <Suspense fallback={null}>
      <RegisterForm />
    </Suspense>
  );
}
