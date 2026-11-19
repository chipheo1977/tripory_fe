import { renderHook } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it } from "vitest";
import { useShortcutHint } from "./use-shortcut-hint";

const original = Object.getOwnPropertyDescriptor(Navigator.prototype, "platform");

function stubPlatform(value: string) {
  Object.defineProperty(navigator, "platform", { value, configurable: true });
}

function Probe() {
  return <span>{useShortcutHint()}</span>;
}

afterEach(() => {
  delete (navigator as unknown as Record<string, unknown>).platform;
  if (original !== undefined) Object.defineProperty(Navigator.prototype, "platform", original);
});

describe("useShortcutHint", () => {
  it.each(["Win32", "Linux x86_64"])("%s → Ctrl", (platform) => {
    stubPlatform(platform);
    expect(renderHook(() => useShortcutHint()).result.current).toBe("Ctrl + Enter để gửi nhanh");
  });

  it.each(["MacIntel", "iPhone", "iPad"])("%s → ⌘", (platform) => {
    stubPlatform(platform);
    expect(renderHook(() => useShortcutHint()).result.current).toBe("⌘ + Enter để gửi nhanh");
  });

  it("userAgentData.platform được ưu tiên", () => {
    stubPlatform("Win32");
    Object.defineProperty(navigator, "userAgentData", { value: { platform: "macOS" }, configurable: true });
    try {
      expect(renderHook(() => useShortcutHint()).result.current).toBe("⌘ + Enter để gửi nhanh");
    } finally {
      delete (navigator as unknown as Record<string, unknown>).userAgentData;
    }
  });

  it("render phía server luôn ra Ctrl", () => {
    stubPlatform("MacIntel");
    expect(renderToString(<Probe />)).toContain("Ctrl + Enter để gửi nhanh");
  });
});
