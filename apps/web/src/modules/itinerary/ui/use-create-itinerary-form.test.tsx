import { makeApiError } from "@tripory/api-client";
import type { Itinerary } from "@tripory/itinerary";
import { parseItineraryId, parseUserId } from "@tripory/shared-kernel";
import { QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { FormEvent, ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { makeQueryClient } from "@/composition/query-client";
import { clearEnteredFromList, enteredFromList } from "./entry-flag";
import { toCreateTripInput, useCreateItineraryForm } from "./use-create-itinerary-form";
import { useCreateBlocks } from "./use-create-blocks";

const h = vi.hoisted(() => ({ create: vi.fn(), push: vi.fn() }));

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: h.push, replace: vi.fn(), back: vi.fn() }) }));
vi.mock("@/composition/itinerary.client", async () => {
  const { createItineraryHooks: factory } = await import("@tripory/itinerary/react");
  const unused = vi.fn();
  return {
    itinerary: factory({
      repository: {
        listMine: unused,
        getById: unused,
        create: (input: unknown) => h.create(input),
        updateMetadata: unused,
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
  };
});

const ID = parseItineraryId("3f2a6c1e-8b7d-4e21-9c55-0a1b2c3d4e5f");
const OWNER = parseUserId("3f2504e0-4f89-11d3-9a0c-0305e82c3301");
if (ID === null || OWNER === null) throw new Error("dữ liệu mẫu phải hợp lệ");

const createdItinerary: Itinerary = {
  id: ID,
  ownerId: OWNER,
  title: "Đã tạo",
  description: null,
  coverImageUrl: null,
  coverImages: [],
  destinationCode: "vn-da-nang",
  interests: [],
  startDate: null,
  isPublic: false,
  totalDistanceKm: 0,
  days: [],
  waypoints: [],
};

const fakeEvent = () => ({ preventDefault: vi.fn() }) as unknown as FormEvent<HTMLFormElement>;

function setupForm() {
  const onCreated = vi.fn();
  const onInvalid = vi.fn();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={makeQueryClient()}>{children}</QueryClientProvider>
  );
  const hook = renderHook(() => useCreateItineraryForm({ onCreated, onInvalid }), { wrapper });
  return { onCreated, onInvalid, ...hook };
}

beforeEach(() => {
  vi.clearAllMocks();
  clearEnteredFromList();
  h.create.mockResolvedValue(createdItinerary);
});

describe("useCreateBlocks", () => {
  it("mặc định chỉ khối Điểm đến mở; đổi, advance và reset", () => {
    const { result } = renderHook(() => useCreateBlocks());
    expect(result.current.openBlocks).toEqual(["destination"]);
    act(() => result.current.setOpenBlocks(["dates"]));
    expect(result.current.openBlocks).toEqual(["dates"]);
    act(() => result.current.advanceFromDestination());
    expect(result.current.openBlocks).toEqual(["name"]);
    act(() => result.current.reset());
    expect(result.current.openBlocks).toEqual(["destination"]);
  });

  it("openAndFocus mở đúng khối rồi gọi focus", () => {
    const { result } = renderHook(() => useCreateBlocks());
    const focus = vi.fn();
    act(() => result.current.openAndFocus("interests", focus));
    expect(result.current.openBlocks).toEqual(["interests"]);
    expect(focus).toHaveBeenCalledTimes(1);
  });

  it("triggerRef lưu phần tử và triggerElement trả lại, null khi tháo", () => {
    const { result } = renderHook(() => useCreateBlocks());
    const button = document.createElement("button");
    result.current.triggerRef("name")(button);
    expect(result.current.triggerElement("name")).toBe(button);
    result.current.triggerRef("name")(null);
    expect(result.current.triggerElement("name")).toBeNull();
  });
});

describe("useCreateItineraryForm", () => {
  it("giá trị mặc định: tên Chuyến đi mới, 3 ngày", () => {
    const { result } = setupForm();
    expect(result.current.title.value).toBe("Chuyến đi mới");
    expect(result.current.form.getValues("dayCount")).toBe(3);
  });

  it("chọn điểm đến đặt mã và tên mặc định; tên riêng thì giữ; xóa trắng rồi blur điền lại", () => {
    const { result } = setupForm();
    act(() => result.current.selectDestination("vn-lam-dong"));
    expect(result.current.form.getValues("destinationCode")).toBe("vn-lam-dong");
    expect(result.current.title.value).toBe("Chuyến đi Lâm Đồng");
    act(() => result.current.title.onChange("Tên riêng"));
    act(() => result.current.selectDestination("vn-da-nang"));
    expect(result.current.title.value).toBe("Tên riêng");
    act(() => result.current.title.onChange("   "));
    act(() => result.current.title.onBlur());
    expect(result.current.title.value).toBe("Chuyến đi Đà Nẵng");
  });

  it("reset về mặc định", () => {
    const { result } = setupForm();
    act(() => result.current.selectDestination("vn-lam-dong"));
    act(() => result.current.reset());
    expect(result.current.title.value).toBe("Chuyến đi mới");
    expect(result.current.form.getValues("destinationCode")).toBeNull();
  });

  it("submit khi chưa chọn điểm đến gọi onInvalid(destination) và không gọi create", async () => {
    const { result, onInvalid } = setupForm();
    await act(async () => result.current.submit(fakeEvent()));
    await waitFor(() => expect(onInvalid).toHaveBeenCalled());
    expect(onInvalid.mock.calls[0]?.[0]).toBe("destination");
    expect(h.create).not.toHaveBeenCalled();
  });

  it("hợp lệ: create đúng một lần với 5 khóa, thành công vào editor và gọi onCreated", async () => {
    const { result, onCreated } = setupForm();
    act(() => result.current.selectDestination("vn-da-nang"));
    await act(async () => result.current.submit(fakeEvent()));
    await waitFor(() => expect(onCreated).toHaveBeenCalledTimes(1));
    expect(h.create).toHaveBeenCalledTimes(1);
    expect(Object.keys(h.create.mock.calls[0]?.[0] as object).toSorted()).toEqual([
      "dayCount",
      "destinationCode",
      "interests",
      "startDate",
      "title",
    ]);
    expect(h.push).toHaveBeenCalledWith(`/itineraries/${ID}/edit`);
    expect(enteredFromList()).toBe(true);
  });

  it("gọi submit hai lần liên tiếp chỉ tạo một request", async () => {
    let resolve: (value: Itinerary) => void = () => undefined;
    h.create.mockReturnValueOnce(new Promise<Itinerary>((done) => (resolve = done)));
    const { result } = setupForm();
    act(() => result.current.selectDestination("vn-da-nang"));
    act(() => {
      result.current.submit(fakeEvent());
      result.current.submit(fakeEvent());
    });
    await waitFor(() => expect(h.create).toHaveBeenCalledTimes(1));
    await act(async () => resolve(createdItinerary));
    expect(h.create).toHaveBeenCalledTimes(1);
  });

  it("lỗi BE theo field gắn vào ô và báo khối lỗi", async () => {
    h.create.mockRejectedValueOnce(makeApiError({ kind: "http", status: 400, code: "Itinerary.DayCountOutOfRange", message: "x" }));
    const { result, onInvalid, onCreated } = setupForm();
    act(() => result.current.selectDestination("vn-da-nang"));
    await act(async () => result.current.submit(fakeEvent()));
    await waitFor(() => expect(onInvalid).toHaveBeenCalled());
    expect(onInvalid.mock.calls[0]?.[0]).toBe("dates");
    expect(result.current.form.formState.errors.dayCount?.message).toBe("Số ngày từ 1 đến 30.");
    expect(onCreated).not.toHaveBeenCalled();
  });

  it("lỗi 500 hiện alert, không toast, không điều hướng", async () => {
    h.create.mockRejectedValueOnce(makeApiError({ kind: "http", status: 500, code: null, message: null }));
    const { result } = setupForm();
    act(() => result.current.selectDestination("vn-da-nang"));
    await act(async () => result.current.submit(fakeEvent()));
    await waitFor(() => expect(result.current.alert).not.toBeNull());
    expect(h.push).not.toHaveBeenCalled();
  });
});

describe("toCreateTripInput", () => {
  const base = { destinationCode: "vn-da-nang", title: "  Tên  ", startDate: "", dayCount: 3, interests: [] as string[] };

  it("trim tên, ngày trống thành null, ngày hợp lệ giữ nguyên, ngày sai thành null", () => {
    expect(toCreateTripInput(base).title).toBe("Tên");
    expect(toCreateTripInput(base).startDate).toBeNull();
    expect(toCreateTripInput({ ...base, startDate: "2026-11-12" }).startDate).toBe("2026-11-12");
    expect(toCreateTripInput({ ...base, startDate: "2026-02-30" }).startDate).toBeNull();
  });

  it("sở thích bỏ trùng, sắp theo danh mục; đúng 5 khóa", () => {
    const input = toCreateTripInput({ ...base, interests: ["shopping", "nature", "nature"] });
    expect(input.interests).toEqual(["nature", "shopping"]);
    expect(Object.keys(input).toSorted()).toEqual(["dayCount", "destinationCode", "interests", "startDate", "title"]);
  });
});
