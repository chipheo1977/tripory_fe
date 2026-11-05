import { makeApiError } from "@tripory/api-client";
import type { MetadataInput } from "@tripory/itinerary";
import { parseItineraryId } from "@tripory/shared-kernel";
import { notify } from "@tripory/ui-web";
import { onlineManager, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { StrictMode, type ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { makeQueryClient } from "@/composition/query-client";
import type { AutosaveSnapshot } from "./metadata-autosave-payload";
import { createSaveStatusStore, SaveStatusProvider } from "./save-status";
import { useMetadataAutosave } from "./use-metadata-autosave";

const h = vi.hoisted(() => ({ updateMetadata: vi.fn() }));

vi.mock("@/composition/itinerary.client", async () => {
  const { createItineraryHooks: factory } = await import("@tripory/itinerary/react");
  const unused = vi.fn();
  return {
    itinerary: factory({
      repository: {
        listMine: unused,
        getById: unused,
        create: unused,
        updateMetadata: (id: string, input: unknown) => h.updateMetadata(id, input),
        publish: unused,
        remove: unused,
        addWaypoint: unused,
        updateWaypoint: unused,
        deleteWaypoint: unused,
        reorderWaypoints: unused,
        setDaySubtitle: unused,
      },
      shortLinks: { resolve: unused },
    }),
    itineraryUnload: { deleteWaypoint: unused },
  };
});

vi.mock("@/composition/session-events.client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/composition/session-events.client")>();
  return { sessionEvents: actual.makeSessionEvents({ createChannel: () => null }) };
});

const ID = parseItineraryId("3f2a6c1e-8b7d-4e21-9c55-0a1b2c3d4e5f");
if (ID === null) throw new Error("id mẫu phải hợp lệ");

const BASELINE: MetadataInput = {
  title: "Gốc",
  description: null,
  startDate: null,
  coverImages: [],
  selectedCoverIndex: null,
};

const http = (status: number, code: string | null, message: string | null) =>
  makeApiError({ kind: "http", status, code, message });

function setup(options: { strict?: boolean } = {}) {
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
  const hook = renderHook(() => useMetadataAutosave(ID!), { wrapper });
  const snap = { title: "Gốc", images: [] as string[], selectedIndex: null as number | null };
  const provider = (): AutosaveSnapshot => ({
    values: { title: snap.title, description: "", startDate: "" },
    gallery: { images: snap.images, selectedIndex: snap.selectedIndex },
  });
  const open = () =>
    act(() => {
      hook.result.current.attach(provider);
      hook.result.current.openForm(BASELINE);
    });
  return { store, snap, open, ...hook };
}

beforeEach(() => {
  h.updateMetadata.mockReset();
  h.updateMetadata.mockResolvedValue(undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("useMetadataAutosave khi trình duyệt offline", () => {
  it("vẫn gọi repository và đi vào luồng lỗi, không bị tạm dừng", async () => {
    onlineManager.setOnline(false);
    h.updateMetadata.mockRejectedValueOnce(makeApiError({ kind: "network" }));
    const { result, snap, open } = setup();
    open();
    snap.title = "Offline";
    act(() => result.current.request());
    try {
      await waitFor(() => expect(h.updateMetadata).toHaveBeenCalledTimes(1));
      await waitFor(() => expect(result.current.state.failure).not.toBeNull());
    } finally {
      onlineManager.setOnline(true);
    }
  });
});
describe("useMetadataAutosave", () => {
  it("request gửi payload 5 khóa, markSaved khi xong và hết dirty", async () => {
    const { result, store, snap, open } = setup();
    open();
    snap.title = "Tên mới";
    act(() => result.current.request());
    await waitFor(() => expect(store.getSnapshot().hasSaved).toBe(true));
    expect(h.updateMetadata).toHaveBeenCalledTimes(1);
    const [id, payload] = h.updateMetadata.mock.calls[0] as [string, MetadataInput];
    expect(id).toBe(ID);
    expect(Object.keys(payload).toSorted()).toEqual([
      "coverImages",
      "description",
      "selectedCoverIndex",
      "startDate",
      "title",
    ]);
    expect(payload.title).toBe("Tên mới");
    expect(result.current.state.dirty).toBe(false);
  });

  it("hai request khi lệnh đầu chưa xong chỉ cho 2 lần gọi repository", async () => {
    let resolveFirst: () => void = () => undefined;
    h.updateMetadata.mockReturnValueOnce(new Promise<void>((resolve) => (resolveFirst = resolve)));
    const { result, snap, open } = setup();
    open();
    snap.title = "A";
    act(() => result.current.request());
    snap.title = "B";
    act(() => result.current.request());
    snap.title = "C";
    act(() => result.current.request());
    await waitFor(() => expect(h.updateMetadata).toHaveBeenCalledTimes(1));
    expect(result.current.state.queued).toBe(true);
    await act(async () => resolveFirst());
    await waitFor(() => expect(h.updateMetadata).toHaveBeenCalledTimes(2));
    expect((h.updateMetadata.mock.calls[1] as [string, MetadataInput])[1].title).toBe("C");
  });

  it("lỗi 500 khi form mở: có alert; retry gọi lại với giá trị mới nhất", async () => {
    h.updateMetadata.mockRejectedValueOnce(http(500, null, null));
    const { result, snap, open } = setup();
    open();
    snap.title = "A";
    act(() => result.current.request());
    await waitFor(() => expect(result.current.state.failure?.alert).toBeTruthy());
    snap.title = "A2";
    act(() => result.current.retry());
    await waitFor(() => expect(h.updateMetadata).toHaveBeenCalledTimes(2));
    expect((h.updateMetadata.mock.calls[1] as [string, MetadataInput])[1].title).toBe("A2");
    await waitFor(() => expect(result.current.state.failure).toBeNull());
  });

  it("closeForm khi còn lỗi chung: markFailed và toast lỗi", async () => {
    const error = vi.spyOn(notify, "error").mockReturnValue("t");
    h.updateMetadata.mockRejectedValueOnce(http(500, null, null));
    const { result, store, snap, open } = setup();
    open();
    snap.title = "A";
    act(() => result.current.request());
    await waitFor(() => expect(result.current.state.failure?.alert).toBeTruthy());
    act(() => result.current.closeForm());
    expect(store.getSnapshot().failure).not.toBeNull();
    expect(error).toHaveBeenCalledTimes(1);
  });

  it("lỗi đến sau closeForm: markFailed ngay", async () => {
    vi.spyOn(notify, "error").mockReturnValue("t");
    let reject: (error: unknown) => void = () => undefined;
    h.updateMetadata.mockReturnValueOnce(new Promise<void>((_resolve, fail) => (reject = fail)));
    const { result, store, snap, open } = setup();
    open();
    snap.title = "A";
    act(() => result.current.request());
    act(() => result.current.closeForm());
    expect(store.getSnapshot().failure).toBeNull();
    await act(async () => reject(http(500, null, null)));
    await waitFor(() => expect(store.getSnapshot().failure).not.toBeNull());
  });

  it("unmount khi còn đồng hồ chữ thì flush gửi payload", async () => {
    vi.useFakeTimers();
    const { result, snap, open, unmount } = setup();
    open();
    snap.title = "Chưa lưu";
    act(() => result.current.schedule());
    expect(h.updateMetadata).not.toHaveBeenCalled();
    unmount();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(h.updateMetadata).toHaveBeenCalledTimes(1);
    expect((h.updateMetadata.mock.calls[0] as [string, MetadataInput])[1].title).toBe("Chưa lưu");
  });

  it("StrictMode: vòng mount-unmount-mount không gửi oan", () => {
    const { open } = setup({ strict: true });
    open();
    expect(h.updateMetadata).not.toHaveBeenCalled();
  });

  it("visibilitychange sang hidden thì flush", async () => {
    vi.useFakeTimers();
    const { result, snap, open } = setup();
    open();
    snap.title = "A";
    act(() => result.current.schedule());
    const original = Object.getOwnPropertyDescriptor(document, "visibilityState");
    Object.defineProperty(document, "visibilityState", { configurable: true, value: "hidden" });
    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
    });
    if (original === undefined) Reflect.deleteProperty(document, "visibilityState");
    else Object.defineProperty(document, "visibilityState", original);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(h.updateMetadata).toHaveBeenCalledTimes(1);
  });

  it("lỗi field BE gắn vào ô và không markFailed", async () => {
    h.updateMetadata.mockRejectedValueOnce(http(400, "ItineraryTitle.TooLong", "Tiêu đề quá dài."));
    const { result, store, snap, open } = setup();
    open();
    snap.title = "A";
    act(() => result.current.request());
    await waitFor(() => expect(result.current.state.failure?.fieldErrors.title).toBe("Tiêu đề quá dài."));
    expect(result.current.state.failure?.alert).toBeNull();
    expect(store.getSnapshot().failure).toBeNull();
  });

  it("lệnh vẫn hoàn tất sau khi hook unmount (callback cấp hook)", async () => {
    let resolve: () => void = () => undefined;
    h.updateMetadata.mockReturnValueOnce(new Promise<void>((done) => (resolve = done)));
    const { result, store, snap, open, unmount } = setup();
    open();
    snap.title = "A";
    act(() => result.current.request());
    unmount();
    await act(async () => resolve());
    await waitFor(() => expect(store.getSnapshot().hasSaved).toBe(true));
  });
});
