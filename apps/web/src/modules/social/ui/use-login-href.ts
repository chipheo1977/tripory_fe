"use client";
// hook dựng đường dẫn đăng nhập từ URL hiện tại, để component không tự đọc URL.
import { usePathname, useSearchParams } from "next/navigation";
import { buildLoginHref } from "./login-href";

/** chỉ theo pathname, không treo prerender; dùng khi không cần giữ `?view`. */
export function usePathLoginHref(): string {
  return buildLoginHref(usePathname(), "");
}

/**
 * giữ cả query (`?view=map`). `useSearchParams` làm cây client tới `<Suspense>` gần nhất render phía client khi
 * prerender (docs Next `use-search-params.md` §Prerendering), nên nơi dùng phải bọc `<Suspense>`.
 */
export function useLoginHref(): string {
  return buildLoginHref(usePathname(), useSearchParams().toString());
}
