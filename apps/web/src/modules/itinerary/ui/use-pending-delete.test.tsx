import { makeApiError } from "@tripory/api-client";
import { parseItineraryId } from "@tripory/shared-kernel";
import { notify } from "@tripory/ui-web";
import { QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react";
import { StrictMode, type ReactNode } from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { makeQueryClient } from "@/composition/query-client";
import { createSaveStatusStore, SaveStatusProvider } from "./save-status";
import { usePendingDelete } from "./use-pending-delete";

const h = vi.hoisted(() => ({ deleteWaypoint: vi.fn(), unloadDelete: vi.fn() }));

vi.mock("@/composition/itinerary.client", async () => {
  const { createItineraryHooks: factory } = await import("@tripory/itinerary/react");
  const unused = vi.fn();
  return {
    itinerary: factory({
      repository: {
        listMine: unused,
        getById: unused,
        create: unused,
        updateMetadata: unused,
        publish: unused,
        remove: unused,
        addWaypoint: unused,
        updateWaypoint: unused,
        deleteWaypoint: (id: string, waypointId: string) => h.deleteWaypoint(id, waypointId),
        reorderWaypoints: unused,
        setDaySubtitle: unused,
      },
      shortLinks: { resolve: unused },
    }),
    itineraryUnload: { deleteWaypoint: (id: string, waypointId: string) => h.unloadDelete(id, waypointId) },
  };
});

vi.mock("@/composition/session-events.client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/composition/session-events.client")>();
  return { sessionEvents: actual.makeSessionEvents({ createChannel: () => null }) };
});

const ID = parseItineraryId("3f2a6c1e-8b7d-4e21-9c55-0a1b2c3d4e5f");
if (ID === null) throw new Error("id mẫu phải hợp lệ");

type UndoOptions = { actionLabel: string; onAction(): void; onDismiss?(): void };
const toasts: UndoOptions[] = [];

function setup(options: { strict?: boolean; onUndone?: (id: string) => void } = {}) {
  const store = createSaveStatusStore();
  const queryClient = makeQueryClient();
  const Inner = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <SaveStatusProvider store={store}>{children}</SaveStatusProvider>
    </QueryClientProvider>
  );
  const wrapper = options.strict
    ? ({ children }: { children: ReactNode }) => (
        <StrictMode>
          <Inner>{children}</Inner>
        </StrictMode>
      )
    : Inner;
  const hook = renderHook(() => usePendingDelete({ itineraryId: ID!, onUndone: options.onUndone }), { wrapper });
  return { store, ...hook };
}

const advance = (ms: number) =>
  act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });

function setVisibility(state: "hidden" | "visible") {
  Object.defineProperty(document, "visibilityState", { configurable: true, get: () => state });
}

beforeEach(() => {
  vi.useFakeTimers();
  toasts.length = 0;
  h.deleteWaypoint.mockReset().mockResolvedValue(undefined);
  h.unloadDelete.mockReset().mockResolvedValue(undefined);
  vi.spyOn(notify, "undoable").mockImplementation((_title, o) => {
    toasts.push(o);
    return toasts.length;
  });
  vi.spyOn(notify, "dismiss").mockImplementation(() => "");
  setVisibility("visible");
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  Reflect.deleteProperty(document, "visibilityState");
});

it("shows an undo toast titled with the name and hides the waypoint at once", () => {
  const { result } = setup();

  act(() => result.current.remove({ id: "w1", name: "Chợ" }));

  expect(notify.undoable).toHaveBeenCalledWith('Đã xóa "Chợ"', expect.objectContaining({ actionLabel: "Hoàn tác" }));
  expect(result.current.pendingIds.has("w1")).toBe(true);
  expect(h.deleteWaypoint).not.toHaveBeenCalled();
});

it("sends DELETE once after exactly 5000 ms (normal path, no keepalive)", async () => {
  const { result } = setup();

  act(() => result.current.remove({ id: "w1", name: "Chợ" }));
  await advance(4_999);
  expect(h.deleteWaypoint).not.toHaveBeenCalled();

  await advance(1);
  expect(h.deleteWaypoint).toHaveBeenCalledTimes(1);
  expect(h.deleteWaypoint).toHaveBeenCalledWith(ID, "w1");
  expect(h.unloadDelete).not.toHaveBeenCalled();
  expect(result.current.pendingIds.size).toBe(0);

  await advance(20_000);
  expect(h.deleteWaypoint).toHaveBeenCalledTimes(1);
});

it("undo within 5 s never calls the backend and reports the waypoint", async () => {
  const onUndone = vi.fn();
  const { result } = setup({ onUndone });

  act(() => result.current.remove({ id: "w1", name: "Chợ" }));
  await advance(2_000);
  act(() => toasts[0]?.onAction());

  expect(result.current.pendingIds.size).toBe(0);
  expect(onUndone).toHaveBeenCalledWith("w1");
  expect(notify.dismiss).toHaveBeenCalled();
  await advance(10_000);
  expect(h.deleteWaypoint).not.toHaveBeenCalled();
});

it("commits at once when the user dismisses the toast", async () => {
  const { result } = setup();

  act(() => result.current.remove({ id: "w1", name: "Chợ" }));
  await act(async () => {
    toasts[0]?.onDismiss?.();
    await vi.advanceTimersByTimeAsync(0);
  });

  expect(h.deleteWaypoint).toHaveBeenCalledTimes(1);
  expect(h.deleteWaypoint).toHaveBeenCalledWith(ID, "w1");
});

it("removing a second waypoint commits the first at once and keeps one pending", async () => {
  const { result } = setup();

  act(() => result.current.remove({ id: "w1", name: "Chợ" }));
  await act(async () => {
    result.current.remove({ id: "w2", name: "Chùa" });
    await vi.advanceTimersByTimeAsync(0);
  });

  expect(h.deleteWaypoint).toHaveBeenCalledTimes(1);
  expect(h.deleteWaypoint).toHaveBeenCalledWith(ID, "w1");
  expect([...result.current.pendingIds]).toEqual(["w2"]);
});

it("flush() sends the pending DELETE immediately (drag start, D-33)", async () => {
  const { result } = setup();

  act(() => result.current.remove({ id: "w1", name: "Chợ" }));
  await act(async () => {
    result.current.flush();
    await vi.advanceTimersByTimeAsync(0);
  });

  expect(h.deleteWaypoint).toHaveBeenCalledWith(ID, "w1");
});

it("sends the pending DELETE on unmount (route leave / Activity hide) even after the observer is gone", async () => {
  const { result, unmount } = setup();

  act(() => result.current.remove({ id: "w1", name: "Chợ" }));
  unmount();
  await advance(0);

  expect(h.deleteWaypoint).toHaveBeenCalledTimes(1);
  expect(h.deleteWaypoint).toHaveBeenCalledWith(ID, "w1");
  expect(h.unloadDelete).not.toHaveBeenCalled();
});

it("unmount without a pending delete sends nothing", async () => {
  const { unmount } = setup();

  unmount();
  await advance(10_000);

  expect(h.deleteWaypoint).not.toHaveBeenCalled();
  expect(h.unloadDelete).not.toHaveBeenCalled();
});

it("pagehide sends the pending DELETE with keepalive instead of the normal mutation", async () => {
  const { result } = setup();

  act(() => result.current.remove({ id: "w1", name: "Chợ" }));
  await act(async () => {
    window.dispatchEvent(new Event("pagehide"));
    await vi.advanceTimersByTimeAsync(10_000);
  });

  expect(h.unloadDelete).toHaveBeenCalledTimes(1);
  expect(h.unloadDelete).toHaveBeenCalledWith(ID, "w1");
  expect(h.deleteWaypoint).not.toHaveBeenCalled();
});

it("visibilitychange to hidden behaves like pagehide, visible does nothing", async () => {
  const { result } = setup();

  act(() => result.current.remove({ id: "w1", name: "Chợ" }));
  await act(async () => {
    setVisibility("visible");
    document.dispatchEvent(new Event("visibilitychange"));
    await vi.advanceTimersByTimeAsync(0);
  });
  expect(h.unloadDelete).not.toHaveBeenCalled();
  expect(result.current.pendingIds.has("w1")).toBe(true);

  await act(async () => {
    setVisibility("hidden");
    document.dispatchEvent(new Event("visibilitychange"));
    await vi.advanceTimersByTimeAsync(0);
  });
  expect(h.unloadDelete).toHaveBeenCalledWith(ID, "w1");
  expect(h.deleteWaypoint).not.toHaveBeenCalled();
});

it("a failed DELETE records a retry that sends the DELETE again", async () => {
  const { result, store } = setup();
  h.deleteWaypoint.mockRejectedValueOnce(makeApiError({ kind: "network", status: null, code: null, message: "Mất kết nối." }));

  act(() => result.current.remove({ id: "w1", name: "Chợ" }));
  await advance(5_000);

  expect(h.deleteWaypoint).toHaveBeenCalledTimes(1);
  expect(store.getSnapshot().failure).not.toBeNull();

  await act(async () => {
    store.getSnapshot().failure?.retry();
    await vi.advanceTimersByTimeAsync(0);
  });

  expect(h.deleteWaypoint).toHaveBeenCalledTimes(2);
  expect(h.deleteWaypoint).toHaveBeenLastCalledWith(ID, "w1");
  expect(store.getSnapshot()).toMatchObject({ hasSaved: true, failure: null });
});

it("StrictMode: one toast, one DELETE, and no commit from the dev mount-unmount-mount", async () => {
  const { result } = setup({ strict: true });
  await advance(0);
  expect(h.deleteWaypoint).not.toHaveBeenCalled();

  act(() => result.current.remove({ id: "w1", name: "Chợ" }));
  expect(notify.undoable).toHaveBeenCalledTimes(1);

  await advance(5_000);
  expect(h.deleteWaypoint).toHaveBeenCalledTimes(1);
});
