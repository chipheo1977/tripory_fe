"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toSafeNextPath } from "@tripory/identity";

/**
 * Lưới an toàn của gate `(dashboard)`: server thấy không có phiên (route quên khai báo trong proxy, cookie bị
 * xóa giữa chừng) thì client chuyển sang /login kèm `next` là trang hiện tại. Render `null`.
 */
export function LoginRedirect() {
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams().toString();
  const done = useRef(false);

  useEffect(() => {
    if (done.current) return;
    done.current = true;

    // Chỉ chuỗi đã qua toSafeNextPath (được encode) hoặc hằng mới vào router (T-03-51).
    const next = toSafeNextPath(`${pathname}${search === "" ? "" : `?${search}`}`);
    router.replace(next === null ? "/login" : `/login?next=${encodeURIComponent(next)}`);
  }, [pathname, search, router]);

  return null;
}
