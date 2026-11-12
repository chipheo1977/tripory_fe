"use client";

// Chế độ Bài viết/Bản đồ của trang công khai trên URL (D-08). Đọc bằng `useSearchParams`/`usePathname`; ghi bằng
// `window.history.pushState` chứ không `router.push`: không refetch RSC/BE khi chỉ đổi chế độ (RESEARCH Pattern 3). Next
// đồng bộ `pushState` với `useSearchParams` (docs 01-app/01-getting-started/04-linking-and-navigating.md, Native History API),
// và nút Back của trình duyệt khôi phục chế độ trước. `useSearchParams` cần `<Suspense>` ở nơi dùng (plan 05-18).
import { usePathname, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { parsePublicView, PUBLIC_VIEW_PARAM, viewSearch, type PublicView } from "./public-view";

export function usePublicView(): Readonly<{ view: PublicView; setView(view: PublicView): void }> {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const view = parsePublicView(searchParams.get(PUBLIC_VIEW_PARAM));

  const setView = useCallback(
    (next: PublicView) => {
      if (next === view) return;
      const search = viewSearch(searchParams.toString(), next);
      const url = search === "" ? pathname : `${pathname}?${search}`;
      window.history.pushState(null, "", url);
    },
    [pathname, searchParams, view],
  );

  return { view, setView };
}
