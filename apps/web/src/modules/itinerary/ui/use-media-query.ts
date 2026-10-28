"use client";

import { useCallback, useSyncExternalStore } from "react";

// Server snapshot luôn `false`: SSR không biết viewport, nên bề mặt form dựng bản hẹp (Sheet) rồi tự đúng lại sau hydrate.
const getServerSnapshot = (): boolean => false;

/** `matchMedia(query).matches` và cập nhật khi cửa sổ đổi cỡ qua ngưỡng. */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (notify: () => void) => {
      const list = window.matchMedia(query);
      list.addEventListener("change", notify);
      return () => list.removeEventListener("change", notify);
    },
    [query],
  );
  const getSnapshot = useCallback(() => window.matchMedia(query).matches, [query]);
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
