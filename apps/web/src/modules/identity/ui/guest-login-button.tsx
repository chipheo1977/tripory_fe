"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { toSafeNextPath } from "@tripory/identity";
import { buttonVariants } from "@tripory/ui-web";

/**
 * Nút duy nhất của header khi là khách (D-08): "Đăng nhập" kèm `next` là trang hiện tại.
 * `/login` và `/register` bị `toSafeNextPath` loại nên tự rơi vào nhánh không có `next`.
 * Là `next/link` + `buttonVariants` (không phải Button render Link) để giữ role link.
 */
export function GuestLoginButton() {
  const pathname = usePathname();
  const search = useSearchParams().toString();
  const next = toSafeNextPath(`${pathname}${search === "" ? "" : `?${search}`}`);
  const href = next === null ? "/login" : `/login?next=${encodeURIComponent(next)}`;

  return (
    <Link
      aria-current={pathname === "/login" ? "page" : undefined}
      className={buttonVariants({ size: "md", variant: "secondary" })}
      href={href}
    >
      Đăng nhập
    </Link>
  );
}
