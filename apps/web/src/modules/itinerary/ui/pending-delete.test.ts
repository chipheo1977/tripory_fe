import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createPendingDeleteController, UNDO_WINDOW_MS, type PendingDeleteController } from "./pending-delete";

type Handlers = { onUndo(): void; onDismiss(): void };

function setup() {
  const toasts: Handlers[] = [];
  const commit = vi.fn();
  const onChange = vi.fn();
  const onUndone = vi.fn();
  const dismissToast = vi.fn();
  const showUndo = vi.fn((_name: string, handlers: Handlers) => {
    toasts.push(handlers);
    return toasts.length;
  });
  const controller: PendingDeleteController = createPendingDeleteController({
    commit,
    showUndo,
    dismissToast,
    onChange,
    onUndone,
  });
  return { controller, toasts, commit, onChange, onUndone, dismissToast, showUndo };
}

const lastChange = (onChange: ReturnType<typeof vi.fn>) => [...(onChange.mock.lastCall?.[0] as Set<string>)];

describe("createPendingDeleteController", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("exposes a 5000 ms undo window", () => {
    expect(UNDO_WINDOW_MS).toBe(5_000);
  });

  it("hides the waypoint at once and commits exactly once after 5000 ms", () => {
    const { controller, commit, onChange, dismissToast, showUndo } = setup();

    controller.remove("w1", "Chợ");

    expect(lastChange(onChange)).toEqual(["w1"]);
    expect(showUndo).toHaveBeenCalledWith("Chợ", expect.any(Object));
    expect(controller.pendingId()).toBe("w1");

    vi.advanceTimersByTime(4_999);
    expect(commit).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(commit).toHaveBeenCalledTimes(1);
    expect(commit).toHaveBeenCalledWith("w1", "normal");
    expect(dismissToast).toHaveBeenCalledWith(1);
    expect(lastChange(onChange)).toEqual([]);
    expect(controller.pendingId()).toBeNull();

    vi.advanceTimersByTime(20_000);
    expect(commit).toHaveBeenCalledTimes(1);
  });

  it("undo within the window never commits, closes the toast and reports the waypoint", () => {
    const { controller, toasts, commit, onChange, onUndone, dismissToast } = setup();

    controller.remove("w1", "Chợ");
    vi.advanceTimersByTime(2_000);
    toasts[0]?.onUndo();

    expect(commit).not.toHaveBeenCalled();
    expect(dismissToast).toHaveBeenCalledWith(1);
    expect(lastChange(onChange)).toEqual([]);
    expect(onUndone).toHaveBeenCalledWith("w1");

    vi.advanceTimersByTime(10_000);
    expect(commit).not.toHaveBeenCalled();
  });

  it("commits at once when the user dismisses the toast", () => {
    const { controller, toasts, commit } = setup();

    controller.remove("w1", "Chợ");
    toasts[0]?.onDismiss();

    expect(commit).toHaveBeenCalledTimes(1);
    expect(commit).toHaveBeenCalledWith("w1", "normal");
    vi.advanceTimersByTime(10_000);
    expect(commit).toHaveBeenCalledTimes(1);
  });

  it("does not commit twice when dismissing the toast re-enters onDismiss", () => {
    const toasts: Handlers[] = [];
    const commit = vi.fn();
    const controller = createPendingDeleteController({
      commit,
      showUndo: (_name, handlers) => {
        toasts.push(handlers);
        return 1;
      },
      // Sonner gọi lại onDismiss khi app tự đóng toast (Pitfall 5).
      dismissToast: () => toasts[0]?.onDismiss(),
      onChange: vi.fn(),
    });

    controller.remove("w1", "Chợ");
    vi.advanceTimersByTime(UNDO_WINDOW_MS);

    expect(commit).toHaveBeenCalledTimes(1);
  });

  it("commits the previous delete at once when a second waypoint is removed", () => {
    const { controller, toasts, commit, onChange, dismissToast } = setup();

    controller.remove("w1", "Chợ");
    controller.remove("w2", "Chùa");

    expect(commit).toHaveBeenCalledTimes(1);
    expect(commit).toHaveBeenCalledWith("w1", "normal");
    expect(dismissToast).toHaveBeenCalledWith(1);
    expect(toasts).toHaveLength(2);
    expect(lastChange(onChange)).toEqual(["w2"]);
    expect(controller.pendingId()).toBe("w2");
  });

  it("ignores a late onDismiss of the old toast so it cannot commit the new delete", () => {
    const { controller, toasts, commit } = setup();

    controller.remove("w1", "Chợ");
    controller.remove("w2", "Chùa");
    toasts[0]?.onDismiss();
    toasts[0]?.onUndo();

    expect(commit).toHaveBeenCalledTimes(1);
    expect(controller.pendingId()).toBe("w2");
  });

  it("restarts the full window for the second waypoint", () => {
    const { controller, commit } = setup();

    controller.remove("w1", "Chợ");
    vi.advanceTimersByTime(3_000);
    controller.remove("w2", "Chùa");
    vi.advanceTimersByTime(4_999);
    expect(commit).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(1);
    expect(commit).toHaveBeenCalledTimes(2);
    expect(commit).toHaveBeenLastCalledWith("w2", "normal");
  });

  it("flush('unload') commits the pending delete via unload and does nothing without one", () => {
    const { controller, commit, dismissToast } = setup();

    controller.flush("unload");
    expect(commit).not.toHaveBeenCalled();
    expect(dismissToast).not.toHaveBeenCalled();

    controller.remove("w1", "Chợ");
    controller.flush("unload");

    expect(commit).toHaveBeenCalledTimes(1);
    expect(commit).toHaveBeenCalledWith("w1", "unload");
    vi.advanceTimersByTime(10_000);
    expect(commit).toHaveBeenCalledTimes(1);
  });

  it("flush() defaults to the normal path", () => {
    const { controller, commit } = setup();

    controller.remove("w1", "Chợ");
    controller.flush();

    expect(commit).toHaveBeenCalledWith("w1", "normal");
  });

  it("uses the injected timer and window", () => {
    const setTimer = vi.fn(() => "handle");
    const clearTimer = vi.fn();
    const controller = createPendingDeleteController({
      commit: vi.fn(),
      showUndo: () => 1,
      dismissToast: vi.fn(),
      onChange: vi.fn(),
      setTimer,
      clearTimer,
      windowMs: 123,
    });

    controller.remove("w1", "Chợ");
    controller.undo();

    expect(setTimer).toHaveBeenCalledWith(expect.any(Function), 123);
    expect(clearTimer).toHaveBeenCalledWith("handle");
  });
});
