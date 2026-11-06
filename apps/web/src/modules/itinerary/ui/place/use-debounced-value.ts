"use client";

import { useEffect, useState } from "react";

/** Giá trị chỉ đổi sau khi `value` đứng yên `delayMs` (gõ tìm địa điểm: 300 ms, D-150). */
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}
