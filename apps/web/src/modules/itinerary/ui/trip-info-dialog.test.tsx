import { makeApiError } from "@tripory/api-client";
import { parseCalendarDate, type Itinerary, type MetadataInput } from "@tripory/itinerary";
import { parseItineraryId, parseUserId } from "@tripory/shared-kernel";
import { notify, Toast } from "@tripory/ui-web";
import { QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { makeQueryClient } from "@/composition/query-client";
import { AUTOSAVE_FAILURE_TOAST_ID } from "./autosave-failure-toast";
import { createSaveStatusStore, SaveStatusProvider, type SaveStatusStore } from "./save-status";
import { TripInfoDialog } from "./trip-info-dialog";
import { useMetadataAutosave } from "./use-metadata-autosave";

const h = vi.hoisted(() => ({ update: vi.fn() }));

vi.mock("@/composition/itinerary.client", async () => {
  const { createItineraryHooks: factory } = await import("@tripory/itinerary/react");
  const unused = vi.fn();
  return {
    itinerary: factory({
      repository: {
        listMine: unused,
        getById: unused,
        create: unused,
        updateMetadata: (_id: string, input: unknown) => h.update(input),
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

vi.mock("@/composition/session-events.client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/composition/session-events.client")>();
  return { sessionEvents: actual.makeSessionEvents({ createChannel: () => null }) };
});

const ID = parseItineraryId("3f2a6c1e-8b7d-4e21-9c55-0a1b2c3d4e5f");
const OWNER = parseUserId("3f2504e0-4f89-11d3-9a0c-0305e82c3301");
const START = parseCalendarDate("2026-10-12");
if (ID === null || OWNER === null || START === null) throw new Error("dữ liệu mẫu phải hợp lệ");

const COVER = "https://img.test/da-lat.jpg";
const COVER_B = "https://img.test/b.jpg";

const base: Itinerary = {
  id: ID,
  ownerId: OWNER,
  title: "Đà Lạt",
  description: "Săn mây",
  coverImageUrl: COVER,
  coverImages: [COVER],
  destinationCode: null,
  interests: [],
  startDate: START,
  isPublic: false,
  totalDistanceKm: 0,
  days: [{ dayNumber: 1, subtitle: null, distanceKm: null }],
  waypoints: [],
};
const twoCovers: Itinerary = { ...base, coverImages: [COVER, COVER_B] };

const http = (status: number, code: string | null, message: string | null) =>
  makeApiError({ kind: "http", status, code, message });

const title = () => screen.getByRole("textbox", { name: /^Tiêu đề/ }) as HTMLInputElement;
const description = () => screen.getByRole("textbox", { name: "Mô tả" }) as HTMLTextAreaElement;
const startDate = () => screen.getByLabelText("Ngày khởi hành") as HTMLInputElement;
const lastPayload = (): MetadataInput => h.update.mock.calls.at(-1)?.[0] as MetadataInput;

const originalMatchMedia = window.matchMedia;
const setWide = (wide: boolean) => {
  window.matchMedia = ((query: string) =>
    ({
      matches: wide,
      media: query,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    }) as unknown as MediaQueryList) as typeof window.matchMedia;
};

type HarnessProps = {
  itinerary: Itinerary;
  onOpenChange: (open: boolean) => void;
};

function Harness({ itinerary, onOpenChange }: HarnessProps) {
  const autosave = useMetadataAutosave(itinerary.id);
  const [open, setOpen] = useState(true);
  return (
    <>
      <button onClick={() => setOpen(true)} type="button">
        Mở lại
      </button>
      <TripInfoDialog
        autosave={autosave}
        itinerary={itinerary}
        onOpenChange={(next) => {
          setOpen(next);
          onOpenChange(next);
        }}
        open={open}
      />
    </>
  );
}

async function setup(options: { itinerary?: Itinerary; store?: SaveStatusStore; fakeTimers?: boolean } = {}) {
  if (options.fakeTimers === true) vi.useFakeTimers();
  const user = userEvent.setup(options.fakeTimers === true ? { advanceTimers: vi.advanceTimersByTime } : {});
  const onOpenChange = vi.fn();
  const store = options.store ?? createSaveStatusStore();
  const wrap = (itinerary: Itinerary) => (
    <QueryClientProvider client={client}>
      <SaveStatusProvider store={store}>
        <Harness itinerary={itinerary} onOpenChange={onOpenChange} />
      </SaveStatusProvider>
      <Toast />
    </QueryClientProvider>
  );
  const client = makeQueryClient();
  const view = render(wrap(options.itinerary ?? base));
  if (options.fakeTimers === true) {
    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });
  } else {
    await screen.findByRole("dialog");
    await waitFor(() => expect(document.activeElement).toBe(title()));
  }
  return { user, onOpenChange, store, rerenderWith: (itinerary: Itinerary) => view.rerender(wrap(itinerary)) };
}

async function settleMicrotasks() {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(0);
  });
}

// jsdom không có Pointer Capture; Sonner gọi nó ở pointerdown của toast khi bấm "Thử lại" bằng chuột.
beforeAll(() => {
  Element.prototype.setPointerCapture ??= () => undefined;
  Element.prototype.releasePointerCapture ??= () => undefined;
});

beforeEach(() => {
  vi.clearAllMocks();
  setWide(true);
  h.update.mockResolvedValue(undefined);
});

afterEach(() => {
  notify.dismiss();
  vi.useRealTimers();
  vi.restoreAllMocks();
  window.matchMedia = originalMatchMedia;
});

describe("TripInfoDialog: cấu trúc", () => {
  it("không nút Lưu/Hủy, không trạng thái Đang lưu/Đã lưu, có nút Đóng và đủ 4 trường", async () => {
    await setup();
    const dialog = await screen.findByRole("dialog", { name: "Thông tin chuyến đi" });
    expect(screen.queryByRole("button", { name: /^Lưu|^Hủy/ })).toBeNull();
    expect(dialog.textContent).not.toMatch(/Đang lưu|Đã lưu/);
    expect(screen.getByRole("button", { name: "Đóng" })).toBeTruthy();
    expect(title()).toBeTruthy();
    expect(description()).toBeTruthy();
    expect(startDate()).toBeTruthy();
    expect(screen.getByRole("radiogroup", { name: "Ảnh bìa" })).toBeTruthy();
    expect(screen.queryByLabelText(/điểm đến|sở thích/i)).toBeNull();
    await waitFor(() => expect(document.activeElement).toBe(title()));
  });

  it("dưới md render bằng Sheet có nút Đóng", async () => {
    setWide(false);
    await setup();
    const sheet = await screen.findByRole("dialog", { name: "Thông tin chuyến đi" });
    expect(sheet.getAttribute("data-sheet-position")).toBe("bottom");
    expect(screen.getByRole("button", { name: "Đóng" })).toBeTruthy();
  });
});

describe("TripInfoDialog: tự lưu ô chữ", () => {
  it("gõ tiêu đề: 799 ms chưa gửi, 800 ms gửi MỘT lệnh với payload 5 khóa", async () => {
    await setup({ fakeTimers: true });
    fireEvent.change(title(), { target: { value: "Đà Lạt!" } });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(799);
    });
    expect(h.update).not.toHaveBeenCalled();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });
    await settleMicrotasks();
    expect(h.update).toHaveBeenCalledTimes(1);
    expect(Object.keys(lastPayload()).toSorted()).toEqual([
      "coverImages",
      "description",
      "selectedCoverIndex",
      "startDate",
      "title",
    ]);
    expect(lastPayload()).toMatchObject({ title: "Đà Lạt!", coverImages: [COVER], selectedCoverIndex: 0 });
  });

  it("blur gửi ngay; blur không đổi gì thì không gửi; blur ngay sau lần lưu do debounce không gửi lại", async () => {
    const { user } = await setup();
    await user.click(title());
    await user.tab();
    expect(h.update).not.toHaveBeenCalled();
    await user.click(description());
    await user.type(description(), " thêm");
    await user.tab();
    await waitFor(() => expect(h.update).toHaveBeenCalledTimes(1));
    expect(lastPayload().description).toBe("Săn mây thêm");
    await user.click(description());
    await user.tab();
    expect(h.update).toHaveBeenCalledTimes(1);
  });

  it("tiêu đề trống, 101 ký tự và mô tả 1001 ký tự: không gửi, lỗi dưới ô", async () => {
    const { user } = await setup();
    await user.clear(title());
    await user.tab();
    expect(await screen.findByText("Vui lòng nhập tiêu đề.")).toBeTruthy();
    fireEvent.change(title(), { target: { value: "a".repeat(101) } });
    await user.tab();
    expect(await screen.findByText("Tiêu đề tối đa 100 ký tự.")).toBeTruthy();
    fireEvent.change(description(), { target: { value: "b".repeat(1001) } });
    fireEvent.blur(description());
    expect(await screen.findByText("Mô tả tối đa 1000 ký tự.")).toBeTruthy();
    expect(h.update).not.toHaveBeenCalled();
  });

  it("payload dùng giá trị hợp lệ gần nhất: tiêu đề sai + đổi ngày mang tiêu đề cũ", async () => {
    await setup();
    fireEvent.change(title(), { target: { value: "" } });
    fireEvent.change(startDate(), { target: { value: "2026-11-12" } });
    await waitFor(() => expect(h.update).toHaveBeenCalledTimes(1));
    expect(lastPayload()).toMatchObject({ title: "Đà Lạt", startDate: "2026-11-12" });
  });
});

describe("TripInfoDialog: ngày khởi hành", () => {
  it("đổi ngày gửi ngay; bấm Xóa Ngày khởi hành gửi startDate null", async () => {
    const { user } = await setup();
    fireEvent.change(startDate(), { target: { value: "2026-11-12" } });
    await waitFor(() => expect(h.update).toHaveBeenCalledTimes(1));
    await user.click(screen.getByRole("button", { name: "Xóa Ngày khởi hành" }));
    await waitFor(() => expect(h.update).toHaveBeenCalledTimes(2));
    expect(lastPayload().startDate).toBeNull();
  });

  it("ô đang focus chuyển thành rỗng do gõ dở không gửi null; blur với ô rỗng thì gửi", async () => {
    await setup();
    startDate().focus();
    fireEvent.change(startDate(), { target: { value: "" } });
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(h.update).not.toHaveBeenCalled();
    fireEvent.blur(startDate());
    await waitFor(() => expect(h.update).toHaveBeenCalledTimes(1));
    expect(lastPayload().startDate).toBeNull();
  });
});

describe("TripInfoDialog: đóng và mở lại", () => {
  it("đóng khi còn debounce hợp lệ thì gửi ngay lúc đóng", async () => {
    const { user, onOpenChange } = await setup();
    await user.type(title(), "!");
    await user.click(screen.getByRole("button", { name: "Đóng" }));
    await waitFor(() => expect(h.update).toHaveBeenCalledTimes(1));
    expect(lastPayload().title).toBe("Đà Lạt!");
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("đóng khi còn ô sai rồi mở lại: ô hiện giá trị đã lưu", async () => {
    const { user } = await setup();
    fireEvent.change(title(), { target: { value: "" } });
    await user.click(screen.getByRole("button", { name: "Đóng" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(h.update).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Mở lại" }));
    await screen.findByRole("dialog");
    expect(title().value).toBe("Đà Lạt");
  });

  it("refetch (đổi prop itinerary) khi đang mở không ghi đè ô đang gõ", async () => {
    const { user, rerenderWith } = await setup();
    await user.type(title(), "!!");
    rerenderWith({ ...base, title: "Tên từ server" });
    expect(title().value).toBe("Đà Lạt!!");
  });
});

describe("TripInfoDialog: ảnh bìa", () => {
  it("thêm ảnh qua khung Link ảnh gửi ngay một lệnh có coverImages mới", async () => {
    const { user } = await setup();
    await user.click(screen.getByRole("button", { name: "Thêm ảnh bìa" }));
    await user.type(screen.getByLabelText("Link ảnh"), `${COVER_B}{Enter}`);
    await waitFor(() => expect(h.update).toHaveBeenCalledTimes(1));
    expect(lastPayload()).toMatchObject({ coverImages: [COVER, COVER_B], selectedCoverIndex: 0 });
  });

  it("chọn ảnh khác bằng mũi tên và xóa ảnh gửi ngay", async () => {
    const { user } = await setup({ itinerary: twoCovers });
    screen.getByRole("radio", { name: "Ảnh bìa 1, đang hiển thị" }).focus();
    await user.keyboard("{ArrowRight}");
    await waitFor(() => expect(h.update).toHaveBeenCalledTimes(1));
    expect(lastPayload().selectedCoverIndex).toBe(1);
    await user.click(screen.getByRole("button", { name: "Xóa ảnh bìa 1" }));
    await waitFor(() => expect(h.update).toHaveBeenCalledTimes(2));
    expect(lastPayload()).toMatchObject({ coverImages: [COVER_B], selectedCoverIndex: 0 });
  });

  it("chuỗi thao tác ảnh khi lệnh đầu chưa xong sinh tối đa 2 lệnh", async () => {
    h.update.mockReturnValueOnce(new Promise<void>(() => undefined));
    const { user } = await setup({ itinerary: twoCovers });
    const first = screen.getByRole("radio", { name: "Ảnh bìa 1, đang hiển thị" });
    first.focus();
    await user.keyboard("{ArrowRight}{ArrowLeft}{ArrowRight}{ArrowLeft}");
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(h.update.mock.calls.length).toBeLessThanOrEqual(1);
  });
});

describe("TripInfoDialog: lỗi", () => {
  const FAILURE_SENTENCE = "Chưa lưu được thay đổi. Đã có lỗi xảy ra, vui lòng thử lại";
  const failureToasts = () => screen.queryAllByText(FAILURE_SENTENCE);

  it("lỗi 500: toast đúng câu kèm Thử lại, không còn InlineAlert trong form; Thử lại gửi payload mới nhất", async () => {
    h.update.mockRejectedValueOnce(http(500, null, null));
    const { user } = await setup();
    fireEvent.change(title(), { target: { value: "Đà Lạt!" } });
    fireEvent.blur(title());
    const toast = await screen.findByText(FAILURE_SENTENCE);
    expect(toast.getAttribute("role")).toBe("alert");
    expect(screen.getByRole("dialog").textContent).not.toContain("Chưa lưu được thay đổi");
    expect(title().value).toBe("Đà Lạt!");
    fireEvent.change(title(), { target: { value: "Đà Lạt!?" } });
    await user.click(screen.getByRole("button", { name: "Thử lại" }));
    await waitFor(() => expect(h.update.mock.calls.length).toBeGreaterThanOrEqual(2));
    expect(lastPayload().title).toBe("Đà Lạt!?");
    await waitFor(() => expect(failureToasts()).toHaveLength(0));
  });

  it("lỗi lặp lại chỉ giữ một toast; lưu thành công sau đó tắt toast", async () => {
    h.update.mockRejectedValueOnce(http(500, null, null)).mockRejectedValueOnce(http(500, null, null));
    await setup();
    fireEvent.change(title(), { target: { value: "Đà Lạt!" } });
    fireEvent.blur(title());
    await screen.findByText(FAILURE_SENTENCE);
    fireEvent.change(title(), { target: { value: "Đà Lạt!?" } });
    fireEvent.blur(title());
    await waitFor(() => expect(h.update).toHaveBeenCalledTimes(2));
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });
    expect(failureToasts()).toHaveLength(1);
    expect(screen.getAllByRole("button", { name: "Thử lại" })).toHaveLength(1);
    fireEvent.change(title(), { target: { value: "Đà Lạt!?!" } });
    fireEvent.blur(title());
    await waitFor(() => expect(h.update).toHaveBeenCalledTimes(3));
    await waitFor(() => expect(failureToasts()).toHaveLength(0));
  });

  it("bấm Thử lại mà lần gửi lại lỗi ngay: vẫn còn đúng một toast và một nút Thử lại sau 500 ms", async () => {
    h.update.mockRejectedValue(http(500, null, null));
    const { user } = await setup();
    fireEvent.change(title(), { target: { value: "Đà Lạt!" } });
    fireEvent.blur(title());
    await screen.findByText(FAILURE_SENTENCE);
    await user.click(screen.getByRole("button", { name: "Thử lại" }));
    await waitFor(() => expect(h.update).toHaveBeenCalledTimes(2));
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 500));
    });
    expect(failureToasts()).toHaveLength(1);
    expect(screen.getAllByRole("button", { name: "Thử lại" })).toHaveLength(1);
  });
  it("đóng khi còn lỗi chung: markFailed ở header, vẫn đúng một toast (mọi lần báo dùng cùng id)", async () => {
    const error = vi.spyOn(notify, "error");
    h.update.mockRejectedValue(http(500, null, null));
    const { user, store } = await setup();
    fireEvent.change(title(), { target: { value: "Đà Lạt!" } });
    fireEvent.blur(title());
    await screen.findByText(FAILURE_SENTENCE);
    await user.click(screen.getByRole("button", { name: "Đóng" }));
    await waitFor(() => expect(store.getSnapshot().failure).not.toBeNull());
    expect(error).toHaveBeenCalled();
    for (const call of error.mock.calls) expect(call[1]).toMatchObject({ id: AUTOSAVE_FAILURE_TOAST_ID });
    expect(failureToasts()).toHaveLength(1);
  });

  it("lỗi field BE gắn vào ô Tiêu đề, không có nút Thử lại", async () => {
    h.update.mockRejectedValueOnce(http(400, "ItineraryTitle.TooLong", "Tiêu đề quá dài."));
    const { user } = await setup();
    await user.type(title(), "!");
    await user.tab();
    expect(await screen.findByText("Tiêu đề quá dài.")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Thử lại" })).toBeNull();
    expect(failureToasts()).toHaveLength(0);
  });

  it("lỗi Itinerary.TooManyCoverImages hiện dưới lưới ảnh và lưới quay về danh sách đã lưu", async () => {
    h.update.mockRejectedValueOnce(http(400, "Itinerary.TooManyCoverImages", "x"));
    const { user } = await setup();
    await user.click(screen.getByRole("button", { name: "Thêm ảnh bìa" }));
    await user.type(screen.getByLabelText("Link ảnh"), `${COVER_B}{Enter}`);
    const alerts = await screen.findAllByText("Chỉ lưu được tối đa 5 ảnh bìa.");
    expect(alerts.length).toBeGreaterThan(0);
    await waitFor(() => expect(screen.getAllByRole("radio")).toHaveLength(1));
  });
});

describe("TripInfoDialog: Esc", () => {
  it("Esc trong khung Link ảnh chỉ đóng khung; Esc ở ô Tiêu đề đóng dialog", async () => {
    const { user, onOpenChange } = await setup();
    await user.click(screen.getByRole("button", { name: "Thêm ảnh bìa" }));
    expect(screen.getByLabelText("Link ảnh")).toBeTruthy();
    await user.keyboard("{Escape}");
    expect(screen.queryByLabelText("Link ảnh")).toBeNull();
    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
    title().focus();
    await user.keyboard("{Escape}");
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
