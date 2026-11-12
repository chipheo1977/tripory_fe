import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { COPIED_RESET_MS, useCopyLink } from "./use-copy-link";
import { useNativeShare } from "./use-native-share";
import { useShareUrl } from "./use-share-url";

const originalClipboard = Object.getOwnPropertyDescriptor(navigator, "clipboard");
const originalShare = Object.getOwnPropertyDescriptor(navigator, "share");

function setClipboard(value: unknown) {
  Object.defineProperty(navigator, "clipboard", { value, configurable: true });
}
function setShare(value: unknown) {
  Object.defineProperty(navigator, "share", { value, configurable: true });
}

function restore(name: "clipboard" | "share", descriptor: PropertyDescriptor | undefined) {
  if (descriptor === undefined) Reflect.deleteProperty(navigator, name);
  else Object.defineProperty(navigator, name, descriptor);
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  restore("clipboard", originalClipboard);
  restore("share", originalShare);
});

describe("useShareUrl", () => {
  it("builds the absolute public url from the browser origin, without a view param", () => {
    const { result, rerender } = renderHook(({ id }) => useShareUrl(id), { initialProps: { id: "abc" } });

    expect(result.current).toBe(`${window.location.origin}/itineraries/abc`);
    expect(result.current).not.toContain("?");
    rerender({ id: "xyz" });
    expect(result.current).toBe(`${window.location.origin}/itineraries/xyz`);
  });
});

describe("useCopyLink", () => {
  it("starts idle, becomes copied on success, then returns to idle after 2000ms", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    setClipboard({ writeText });
    const { result } = renderHook(() => useCopyLink());
    expect(result.current.status).toBe("idle");

    await act(async () => {
      await result.current.copy("https://x.test");
    });
    expect(writeText).toHaveBeenCalledWith("https://x.test");
    expect(result.current.status).toBe("copied");

    act(() => vi.advanceTimersByTime(COPIED_RESET_MS - 1));
    expect(result.current.status).toBe("copied");
    act(() => vi.advanceTimersByTime(1));
    expect(result.current.status).toBe("idle");
  });

  it("restarts the 2000ms window when copied again while still copied", async () => {
    setClipboard({ writeText: vi.fn().mockResolvedValue(undefined) });
    const { result } = renderHook(() => useCopyLink());
    await act(async () => {
      await result.current.copy("a");
    });
    act(() => vi.advanceTimersByTime(1500));
    await act(async () => {
      await result.current.copy("a");
    });
    act(() => vi.advanceTimersByTime(1500));

    expect(result.current.status).toBe("copied");
    act(() => vi.advanceTimersByTime(500));
    expect(result.current.status).toBe("idle");
  });

  it("reports failed when writeText rejects and does not reset by itself", async () => {
    setClipboard({ writeText: vi.fn().mockRejectedValue(new Error("denied")) });
    const { result } = renderHook(() => useCopyLink());

    await act(async () => {
      await result.current.copy("a");
    });
    expect(result.current.status).toBe("failed");
    act(() => vi.advanceTimersByTime(10_000));
    expect(result.current.status).toBe("failed");
  });

  it("reports failed when the clipboard api is missing", async () => {
    setClipboard(undefined);
    const { result } = renderHook(() => useCopyLink());

    await act(async () => {
      await result.current.copy("a");
    });
    expect(result.current.status).toBe("failed");
  });

  it("reset returns to idle", async () => {
    setClipboard({ writeText: vi.fn().mockRejectedValue(new Error("denied")) });
    const { result } = renderHook(() => useCopyLink());
    await act(async () => {
      await result.current.copy("a");
    });

    act(() => result.current.reset());
    expect(result.current.status).toBe("idle");
  });

  it("cancels the pending reset on unmount", async () => {
    setClipboard({ writeText: vi.fn().mockResolvedValue(undefined) });
    const { result, unmount } = renderHook(() => useCopyLink());
    await act(async () => {
      await result.current.copy("a");
    });

    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});

describe("useNativeShare", () => {
  it("is unsupported without navigator.share", () => {
    setShare(undefined);
    const { result } = renderHook(() => useNativeShare());

    expect(result.current.supported).toBe(false);
  });

  it("shares title and url and resolves shared", async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    setShare(share);
    const { result } = renderHook(() => useNativeShare());

    expect(result.current.supported).toBe(true);
    await expect(result.current.share({ title: "Sài Gòn", url: "https://x.test" })).resolves.toBe("shared");
    expect(share).toHaveBeenCalledWith({ title: "Sài Gòn", url: "https://x.test" });
  });

  it("treats AbortError as cancelled", async () => {
    setShare(vi.fn().mockRejectedValue(new DOMException("closed", "AbortError")));
    const { result } = renderHook(() => useNativeShare());

    await expect(result.current.share({ title: "t", url: "u" })).resolves.toBe("cancelled");
  });

  it("treats any other error as failed", async () => {
    setShare(vi.fn().mockRejectedValue(new Error("boom")));
    const { result } = renderHook(() => useNativeShare());

    await expect(result.current.share({ title: "t", url: "u" })).resolves.toBe("failed");
  });

  it("returns failed without throwing when sharing is unsupported", async () => {
    setShare(undefined);
    const { result } = renderHook(() => useNativeShare());

    await expect(result.current.share({ title: "t", url: "u" })).resolves.toBe("failed");
  });
});
