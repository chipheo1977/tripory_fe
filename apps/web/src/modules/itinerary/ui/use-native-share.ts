"use client";

// Web Share (D-13): `supported` chỉ khi trình duyệt có `navigator.share` (nơi gọi dùng nó làm prop `visible`).
// Người dùng đóng bảng chia sẻ là `AbortError` -> "cancelled", im lặng (không báo lỗi).
import { useCallback, useSyncExternalStore } from "react";

export type ShareOutcome = "shared" | "cancelled" | "failed";

const subscribeNever = (): (() => void) => () => undefined;
const readSupported = (): boolean => typeof navigator.share === "function";
const readServerSupported = (): boolean => false;

function isAbortError(error: unknown): boolean {
  return typeof error === "object" && error !== null && "name" in error && error.name === "AbortError";
}

export function useNativeShare(): Readonly<{
  supported: boolean;
  share(data: Readonly<{ title: string; url: string }>): Promise<ShareOutcome>;
}> {
  const supported = useSyncExternalStore(subscribeNever, readSupported, readServerSupported);

  const share = useCallback(
    async ({ title, url }: Readonly<{ title: string; url: string }>): Promise<ShareOutcome> => {
      if (!readSupported()) return "failed";
      try {
        await navigator.share({ title, url });
        return "shared";
      } catch (error) {
        return isAbortError(error) ? "cancelled" : "failed";
      }
    },
    [],
  );

  return { supported, share };
}
