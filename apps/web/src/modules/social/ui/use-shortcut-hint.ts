"use client";
// nhãn phím tắt gửi nhanh theo nền tảng (RESEARCH R5). nền tảng không đổi trong phiên nên không cần subscribe;
// server luôn ra nhãn Ctrl để HTML server và lần render client đầu trùng nhau, rồi React đổi sang ⌘ trên Apple.
import { useSyncExternalStore } from "react";
import { SOCIAL_COPY } from "./social-copy";

type NavigatorWithUaData = Navigator & { userAgentData?: { platform?: string } };

// không phân biệt hoa thường: `userAgentData.platform` là "macOS", `navigator.platform` là "MacIntel".
const APPLE_PLATFORM = /mac|iphone|ipad/i;

const subscribeNever = (): (() => void) => () => undefined;

const readIsApple = (): boolean => {
  const nav = navigator as NavigatorWithUaData;
  const platform = nav.userAgentData?.platform || nav.platform || nav.userAgent;
  return APPLE_PLATFORM.test(platform);
};

const readServerIsApple = (): boolean => false;

export function useShortcutHint(): string {
  const isApple = useSyncExternalStore(subscribeNever, readIsApple, readServerIsApple);
  return isApple ? SOCIAL_COPY.shortcutMeta : SOCIAL_COPY.shortcutCtrl;
}
