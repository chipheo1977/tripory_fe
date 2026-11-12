import { notify } from "@tripory/ui-web";
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useShareAfterPublish } from "./use-share-after-publish";

let success: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  success = vi.spyOn(notify, "success").mockImplementation(() => "");
});

afterEach(() => {
  vi.restoreAllMocks();
});

const setup = () => {
  const fallback = { current: { focus: vi.fn() } as unknown as HTMLElement };
  const hook = renderHook(() => useShareAfterPublish({ fallbackFocusRef: fallback }));
  const shareButton = { focus: vi.fn() } as unknown as HTMLButtonElement;
  return { ...hook, fallback, shareButton };
};

describe("useShareAfterPublish", () => {
  it("starts closed", () => {
    const { result } = setup();

    expect(result.current.shareOpen).toBe(false);
  });

  it("opens the share box only after the publish box has closed, and only once", () => {
    const { result } = setup();

    act(() => result.current.onPublished());
    expect(result.current.shareOpen).toBe(false);
    act(() => result.current.onPublishClosed());
    expect(result.current.shareOpen).toBe(true);
    act(() => result.current.setShareOpen(false));
    act(() => result.current.onPublishClosed());
    expect(result.current.shareOpen).toBe(false);
  });

  it("does not open when the publish box closes without a successful publish", () => {
    const { result } = setup();

    act(() => result.current.onPublishClosed());

    expect(result.current.shareOpen).toBe(false);
  });

  it("toasts exactly once when the auto-opened box has finished closing, then focuses the share button", () => {
    const { result, shareButton } = setup();
    result.current.shareButtonRef.current = shareButton;
    act(() => result.current.onPublished());
    act(() => result.current.onPublishClosed());

    act(() => result.current.onShareClosed(true));
    expect(success).not.toHaveBeenCalled();
    act(() => result.current.onShareClosed(false));

    expect(success).toHaveBeenCalledTimes(1);
    expect(success).toHaveBeenCalledWith("Đã xuất bản lịch trình");
    expect(shareButton.focus).toHaveBeenCalledTimes(1);
  });

  it("falls back to the trip info button when the share button is not there yet", () => {
    const { result, fallback } = setup();
    act(() => result.current.onPublished());
    act(() => result.current.onPublishClosed());

    act(() => result.current.onShareClosed(false));

    expect((fallback.current.focus as ReturnType<typeof vi.fn>).mock.calls).toHaveLength(1);
  });

  it("does not toast again when the box is reopened by hand and closed", () => {
    const { result } = setup();
    act(() => result.current.onPublished());
    act(() => result.current.onPublishClosed());
    act(() => result.current.onShareClosed(false));
    expect(success).toHaveBeenCalledTimes(1);

    act(() => result.current.openShare());
    expect(result.current.shareOpen).toBe(true);
    act(() => result.current.onShareClosed(false));

    expect(success).toHaveBeenCalledTimes(1);
  });

  it("a hand-opened box never toasts", () => {
    const { result } = setup();

    act(() => result.current.openShare());
    act(() => result.current.onShareClosed(false));

    expect(success).not.toHaveBeenCalled();
  });
});
