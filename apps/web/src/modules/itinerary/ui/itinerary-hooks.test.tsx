import type { Itinerary, ItineraryRepository, Page, ItinerarySummary, Waypoint } from "@tripory/itinerary";
import { createItineraryHooks, itineraryKeys } from "@tripory/itinerary/react";
import { createWgs84Coordinate, parseItineraryId, parseUserId } from "@tripory/shared-kernel";
import { QueryClientProvider, useIsMutating } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { makeQueryClient } from "@/composition/query-client";

// Hành vi hook thật (không mock React Query) với repository giả: tuần tự theo scope, optimistic + rollback,
// settle theo lệnh ghi cuối, infinite query. Package chỉ có `vitest` nên test hành vi chạy ở app (04-09).

const ID = parseItineraryId("3f2a6c1e-8b7d-4e21-9c55-0a1b2c3d4e5f");
const OWNER = parseUserId("3f2504e0-4f89-11d3-9a0c-0305e82c3301");
const COORDINATE = createWgs84Coordinate({ latitude: 16.0471, longitude: 108.2068 });
if (ID === null || OWNER === null || COORDINATE === null) throw new Error("dữ liệu mẫu phải hợp lệ");

const waypoint = (id: string, dayNumber: number, orderIndex: number): Waypoint => ({
  id,
  dayNumber,
  orderIndex,
  name: `Điểm ${id}`,
  address: null,
  notes: null,
  coordinate: COORDINATE,
});

const makeItinerary = (): Itinerary => ({
  id: ID,
  ownerId: OWNER,
  title: "Đà Nẵng 3 ngày",
  description: null,
  coverImageUrl: null,
  coverImages: [],
  destinationCode: null,
  interests: [],
  startDate: null,
  isPublic: false,
  totalDistanceKm: 0,
  days: [{ dayNumber: 1, subtitle: null, distanceKm: null }],
  waypoints: [waypoint("w1", 1, 0), waypoint("w2", 1, 1), waypoint("w3", 1, 2)],
});

type Deferred<T = void> = { promise: Promise<T>; resolve: (value: T) => void; reject: (reason: unknown) => void };

function deferred<T = void>(): Deferred<T> {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((done, fail) => {
    resolve = done;
    reject = fail;
  });
  return { promise, resolve, reject };
}

function makeRepository(overrides: Partial<ItineraryRepository> = {}) {
  const repository = {
    listMine: vi.fn(async (): Promise<Page<ItinerarySummary>> => ({ items: [], pageIndex: 1, hasNextPage: false })),
    getById: vi.fn(async () => makeItinerary()),
    create: vi.fn(async () => makeItinerary()),
    updateMetadata: vi.fn(async () => undefined),
    publish: vi.fn(async () => undefined),
    remove: vi.fn(async () => undefined),
    addWaypoint: vi.fn(async () => waypoint("w4", 1, 3)),
    updateWaypoint: vi.fn(async () => undefined),
    deleteWaypoint: vi.fn(async () => undefined),
    reorderWaypoints: vi.fn(async () => undefined),
    setDaySubtitle: vi.fn(async () => undefined),
    ...overrides,
  } satisfies ItineraryRepository;
  return repository;
}

function setup(overrides: Partial<ItineraryRepository> = {}) {
  const repository = makeRepository(overrides);
  const resolve = vi.fn(async (url: string) => url);
  const hooks = createItineraryHooks({ repository, shortLinks: { resolve } });
  const queryClient = makeQueryClient();
  queryClient.setQueryData(itineraryKeys.detail(ID!), makeItinerary());
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { repository, resolve, hooks, queryClient, wrapper };
}

const idsOfDay1 = (queryClient: ReturnType<typeof makeQueryClient>): string[] | undefined =>
  queryClient
    .getQueryData<Itinerary>(itineraryKeys.detail(ID!))
    ?.waypoints.filter((w) => w.dayNumber === 1)
    .map((w) => w.id);

const REORDER = { dayNumber: 1, orderedIds: ["w3", "w2", "w1"] } as const;

describe("itinerary hooks: lệnh ghi tuần tự theo scope (D-33)", () => {
  it("DELETE rồi reorder gọi liền nhau: reorder chỉ tới repository sau khi DELETE xong", async () => {
    const gate = deferred();
    const { repository, hooks, wrapper } = setup({ deleteWaypoint: vi.fn(() => gate.promise) });
    const { result } = renderHook(
      () => ({ del: hooks.useDeleteWaypoint(ID!), reorder: hooks.useReorderWaypoints(ID!) }),
      { wrapper },
    );

    act(() => {
      result.current.del.mutate({ waypointId: "w3" });
      result.current.reorder.mutate({ dayNumber: 1, orderedIds: ["w2", "w1"] });
    });

    await waitFor(() => expect(repository.deleteWaypoint).toHaveBeenCalledTimes(1));
    await new Promise<void>((done) => setTimeout(done, 30));
    expect(repository.reorderWaypoints).not.toHaveBeenCalled();

    await act(async () => {
      gate.resolve();
    });

    await waitFor(() => expect(repository.reorderWaypoints).toHaveBeenCalledTimes(1));
    expect(repository.reorderWaypoints).toHaveBeenCalledWith(ID, { dayNumber: 1, orderedIds: ["w2", "w1"] });
  });

  it("useIsMutating trên khóa ghi chung > 0 khi lệnh trong scope đang xếp hàng", async () => {
    const gate = deferred();
    const { hooks, wrapper } = setup({ deleteWaypoint: vi.fn(() => gate.promise) });
    const { result } = renderHook(
      () => ({
        del: hooks.useDeleteWaypoint(ID!),
        reorder: hooks.useReorderWaypoints(ID!),
        pending: useIsMutating({ mutationKey: itineraryKeys.write(ID!) }),
      }),
      { wrapper },
    );
    expect(result.current.pending).toBe(0);

    act(() => {
      result.current.del.mutate({ waypointId: "w3" });
      result.current.reorder.mutate({ dayNumber: 1, orderedIds: ["w2", "w1"] });
    });
    await waitFor(() => expect(result.current.pending).toBe(2));

    await act(async () => {
      gate.resolve();
    });
    await waitFor(() => expect(result.current.pending).toBe(0));
  });
});

describe("itinerary hooks: optimistic và rollback", () => {
  it("reorder đổi cache ngay, repository lỗi thì cache về thứ tự cũ", async () => {
    const gate = deferred();
    const { queryClient, hooks, wrapper } = setup({ reorderWaypoints: vi.fn(() => gate.promise) });
    const { result } = renderHook(() => hooks.useReorderWaypoints(ID!), { wrapper });
    expect(idsOfDay1(queryClient)).toEqual(["w1", "w2", "w3"]);

    act(() => {
      result.current.mutate(REORDER);
    });
    await waitFor(() => expect(idsOfDay1(queryClient)).toEqual(["w3", "w2", "w1"]));

    await act(async () => {
      gate.reject(new Error("boom"));
    });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(idsOfDay1(queryClient)).toEqual(["w1", "w2", "w3"]);
  });

  it("options.onError của caller chạy sau rollback (cache đã là bản cũ khi callback chạy)", async () => {
    const gate = deferred();
    const { queryClient, hooks, wrapper } = setup({ reorderWaypoints: vi.fn(() => gate.promise) });
    let seenInCallback: string[] | undefined;
    const onError = vi.fn(() => {
      seenInCallback = idsOfDay1(queryClient);
    });
    const { result } = renderHook(() => hooks.useReorderWaypoints(ID!, { onError }), { wrapper });

    act(() => {
      result.current.mutate(REORDER);
    });
    await waitFor(() => expect(idsOfDay1(queryClient)).toEqual(["w3", "w2", "w1"]));
    await act(async () => {
      gate.reject(new Error("boom"));
    });

    await waitFor(() => expect(onError).toHaveBeenCalledTimes(1));
    expect(seenInCallback).toEqual(["w1", "w2", "w3"]);
  });

  it("callback cấp hook vẫn chạy khi component unmount giữa chừng (bài học 03-11)", async () => {
    const gate = deferred();
    const { queryClient, hooks, wrapper } = setup({ reorderWaypoints: vi.fn(() => gate.promise) });
    const onError = vi.fn();
    const { result, unmount } = renderHook(() => hooks.useReorderWaypoints(ID!, { onError }), { wrapper });

    act(() => {
      result.current.mutate(REORDER);
    });
    await waitFor(() => expect(idsOfDay1(queryClient)).toEqual(["w3", "w2", "w1"]));
    unmount();
    await act(async () => {
      gate.reject(new Error("boom"));
    });

    await waitFor(() => expect(idsOfDay1(queryClient)).toEqual(["w1", "w2", "w3"]));
    expect(onError).toHaveBeenCalledTimes(1);
  });

  it("xóa waypoint, phụ đề và thêm ngày cập nhật cache ngay", async () => {
    const gate = deferred();
    const { queryClient, hooks, wrapper } = setup({
      deleteWaypoint: vi.fn(() => gate.promise),
      setDaySubtitle: vi.fn(() => gate.promise),
    });
    const { result } = renderHook(
      () => ({
        del: hooks.useDeleteWaypoint(ID!),
        subtitle: hooks.useSetDaySubtitle(ID!),
        addDay: hooks.useAddDay(ID!),
      }),
      { wrapper },
    );

    act(() => {
      result.current.del.mutate({ waypointId: "w2" });
      result.current.subtitle.mutate({ dayNumber: 1, subtitle: "  Biển Mỹ Khê " });
      result.current.addDay.mutate({ dayNumber: 2 });
    });

    await waitFor(() => {
      const cached = queryClient.getQueryData<Itinerary>(itineraryKeys.detail(ID!));
      expect(cached?.waypoints.map((w) => w.id)).toEqual(["w1", "w3"]);
      expect(cached?.days).toEqual([
        { dayNumber: 1, subtitle: "Biển Mỹ Khê", distanceKm: null },
        { dayNumber: 2, subtitle: null, distanceKm: null },
      ]);
    });

    await act(async () => {
      gate.resolve();
    });
  });
});

describe("itinerary hooks: settle theo lệnh ghi cuối", () => {
  it("hai reorder liên tiếp chỉ gây một lần getById sau khi cả hai xong", async () => {
    const first = deferred();
    const reorderWaypoints = vi.fn().mockImplementationOnce(() => first.promise).mockResolvedValue(undefined);
    const getById = vi.fn(async () => makeItinerary());
    const { hooks, wrapper } = setup({ reorderWaypoints, getById });
    const { result } = renderHook(
      () => ({ query: hooks.useItinerary(ID!), reorder: hooks.useReorderWaypoints(ID!) }),
      { wrapper },
    );
    await waitFor(() => expect(result.current.query.isFetching).toBe(false));
    getById.mockClear();

    act(() => {
      result.current.reorder.mutate(REORDER);
      result.current.reorder.mutate({ dayNumber: 1, orderedIds: ["w2", "w3", "w1"] });
    });
    await waitFor(() => expect(reorderWaypoints).toHaveBeenCalledTimes(1));

    await act(async () => {
      first.resolve();
    });
    await waitFor(() => expect(reorderWaypoints).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(getById).toHaveBeenCalledTimes(1));
    await new Promise<void>((done) => setTimeout(done, 30));

    expect(getById).toHaveBeenCalledTimes(1);
  });

  it("thêm waypoint chèn điểm BE trả về vào cuối ngày", async () => {
    const { queryClient, hooks, wrapper } = setup();
    const { result } = renderHook(() => hooks.useAddWaypoint(ID!), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({
        dayNumber: 1,
        name: "Cầu Rồng",
        address: null,
        notes: null,
        coordinate: COORDINATE,
      });
    });

    expect(idsOfDay1(queryClient)).toEqual(["w1", "w2", "w3", "w4"]);
  });
});

describe("itinerary hooks: danh sách và xóa lịch trình", () => {
  it("useMyItineraries('draft') hỏi trang 1 cỡ 12; fetchNextPage hỏi trang 2 khi còn trang", async () => {
    const listMine = vi
      .fn<ItineraryRepository["listMine"]>()
      .mockResolvedValueOnce({ items: [], pageIndex: 1, hasNextPage: true })
      .mockResolvedValueOnce({ items: [], pageIndex: 2, hasNextPage: false });
    const { hooks, wrapper } = setup({ listMine });
    const { result } = renderHook(() => hooks.useMyItineraries("draft"), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(listMine).toHaveBeenNthCalledWith(
      1,
      { pageIndex: 1, pageSize: 12, status: "draft" },
      expect.any(AbortSignal),
    );
    expect(result.current.hasNextPage).toBe(true);

    await act(async () => {
      await result.current.fetchNextPage();
    });

    expect(listMine).toHaveBeenNthCalledWith(
      2,
      { pageIndex: 2, pageSize: 12, status: "draft" },
      expect.any(AbortSignal),
    );
    await waitFor(() => expect(result.current.hasNextPage).toBe(false));
  });

  it("trang cuối (hasNextPage false) thì query không còn trang kế", async () => {
    const { hooks, wrapper } = setup();
    const { result } = renderHook(() => hooks.useMyItineraries("all"), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.hasNextPage).toBe(false);
  });

  it("mỗi status một key: đổi tab không dùng chung cache", async () => {
    const { queryClient, hooks, wrapper } = setup();
    const { result, rerender } = renderHook(({ status }) => hooks.useMyItineraries(status), {
      wrapper,
      initialProps: { status: "all" as "all" | "published" },
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    rerender({ status: "published" });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(queryClient.getQueryData(itineraryKeys.list("all"))).toBeDefined();
    expect(queryClient.getQueryData(itineraryKeys.list("published"))).toBeDefined();
  });

  it("xóa lịch trình: chi tiết bị gỡ khỏi cache, danh sách bị invalidate", async () => {
    const { queryClient, hooks, wrapper } = setup();
    queryClient.setQueryData(itineraryKeys.list("all"), { pages: [], pageParams: [] });
    const { result } = renderHook(() => hooks.useDeleteItinerary(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync(ID!);
    });

    expect(queryClient.getQueryData(itineraryKeys.detail(ID!))).toBeUndefined();
    expect(queryClient.getQueryState(itineraryKeys.list("all"))?.isInvalidated).toBe(true);
  });

  it("tạo lịch trình seed cache chi tiết để editor mở ngay", async () => {
    const created = makeItinerary();
    const { queryClient, hooks, wrapper } = setup({ create: vi.fn(async () => created) });
    queryClient.removeQueries({ queryKey: itineraryKeys.detail(ID!) });
    const { result } = renderHook(() => hooks.useCreateItinerary(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ title: "Đà Nẵng 3 ngày" });
    });

    expect(queryClient.getQueryData(itineraryKeys.detail(ID!))).toEqual(created);
  });

  it("useResolveShortLink gọi resolver và không dùng khóa ghi của editor", async () => {
    const { resolve, hooks, wrapper } = setup();
    const { result } = renderHook(
      () => ({
        resolver: hooks.useResolveShortLink(),
        pending: useIsMutating({ mutationKey: itineraryKeys.write(ID!) }),
      }),
      { wrapper },
    );

    let url = "";
    await act(async () => {
      url = await result.current.resolver.mutateAsync({ url: "https://maps.app.goo.gl/x" });
    });

    expect(resolve).toHaveBeenCalledWith("https://maps.app.goo.gl/x");
    expect(url).toBe("https://maps.app.goo.gl/x");
    expect(result.current.pending).toBe(0);
  });
});
