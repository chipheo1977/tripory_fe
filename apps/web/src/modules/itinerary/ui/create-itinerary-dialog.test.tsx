import { makeApiError } from "@tripory/api-client";
import type { Itinerary } from "@tripory/itinerary";
import { parseItineraryId, parseUserId } from "@tripory/shared-kernel";
import { notify } from "@tripory/ui-web";
import { QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { COLD_START_MESSAGE } from "@/components/submit-status";
import { makeQueryClient } from "@/composition/query-client";
import { CreateItineraryDialog } from "./create-itinerary-dialog";
import { clearEnteredFromList, enteredFromList } from "./entry-flag";

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
  days: [{ dayNumber: 1, subtitle: null, distanceKm: null }],
  waypoints: [],
};

const http = (status: number, code: string | null, message: string | null) =>
  makeApiError({ kind: "http", status, code, message });

const originalMatchMedia = window.matchMedia;
function installMatchMedia(wide: boolean) {
  window.matchMedia = ((query: string) => ({
    matches: wide,
    media: query,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  })) as unknown as typeof window.matchMedia;
}

function Harness({ onOpenChange }: { onOpenChange: (open: boolean) => void }) {
  const [open, setOpen] = useState(true);
  return (
    <>
      <button onClick={() => setOpen(true)} type="button">
        Mở lại
      </button>
      <CreateItineraryDialog
        onOpenChange={(next) => {
          onOpenChange(next);
          setOpen(next);
        }}
        open={open}
      />
    </>
  );
}

function setup(options: { wide?: boolean; onOpenChange?: (open: boolean) => void } = {}) {
  installMatchMedia(options.wide ?? true);
  const onOpenChange = options.onOpenChange ?? vi.fn();
  const user = userEvent.setup();
  const view = render(
    <QueryClientProvider client={makeQueryClient()}>
      <Harness onOpenChange={onOpenChange} />
    </QueryClientProvider>,
  );
  return { user, onOpenChange, ...view };
}

const trigger = (name: RegExp) => screen.getByRole("button", { name });
const destinationTrigger = () => trigger(/^Điểm đến/);
const nameTrigger = () => trigger(/^Tên chuyến đi/);
const datesTrigger = () => trigger(/^Thời gian/);
const interestsTrigger = () => trigger(/^Sở thích/);
const titleInput = () => screen.getByRole("textbox", { name: /Tên chuyến đi/ }) as HTMLInputElement;
const submitButton = () => screen.getByRole("button", { name: /^Tạo lịch trình|Đang tạo/ });
const option = (name: string) => screen.getAllByRole("radio", { name })[0] as HTMLElement;

/** Chờ modal mở và focus ban đầu (ô tìm trên desktop) ổn định để không cướp focus của test. */
async function ready() {
  await screen.findByRole("dialog");
  await waitFor(() => expect(document.activeElement).toBe(screen.getByRole("searchbox", { name: "Tìm điểm đến" })));
}

async function chooseDestination(user: ReturnType<typeof userEvent.setup>, name: string) {
  await user.click(option(name));
}

beforeEach(() => {
  vi.clearAllMocks();
  clearEnteredFromList();
  h.create.mockResolvedValue(createdItinerary);
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  window.matchMedia = originalMatchMedia;
});

describe("CreateItineraryDialog: khối và tóm tắt", () => {
  it("mở: khối Điểm đến mở, ba khối còn lại đóng, có tiêu đề", async () => {
    setup();
    expect(await screen.findByRole("dialog", { name: "Lịch trình mới" })).toBeTruthy();
    expect(destinationTrigger().getAttribute("aria-expanded")).toBe("true");
    for (const other of [nameTrigger(), datesTrigger(), interestsTrigger()]) {
      expect(other.getAttribute("aria-expanded")).toBe("false");
    }
  });

  it("mở khối bất kỳ, chỉ một khối mở, bấm lại thì đóng", async () => {
    const { user } = setup();
    await user.click(nameTrigger());
    expect(nameTrigger().getAttribute("aria-expanded")).toBe("true");
    expect(destinationTrigger().getAttribute("aria-expanded")).toBe("false");
    await user.click(interestsTrigger());
    expect(interestsTrigger().getAttribute("aria-expanded")).toBe("true");
    expect(nameTrigger().getAttribute("aria-expanded")).toBe("false");
    await user.click(interestsTrigger());
    expect(interestsTrigger().getAttribute("aria-expanded")).toBe("false");
  });

  it("tóm tắt ban đầu và đổi theo giá trị", async () => {
    const { user } = setup();
    expect(destinationTrigger().textContent).toContain("Chưa chọn");
    expect(nameTrigger().textContent).toContain("Chuyến đi mới");
    expect(datesTrigger().textContent).toContain("3 ngày");
    expect(interestsTrigger().textContent).toContain("Chưa chọn");
    await chooseDestination(user, "Đà Nẵng");
    expect(destinationTrigger().textContent).toContain("Đà Nẵng");
    expect(nameTrigger().textContent).toContain("Chuyến đi Đà Nẵng");
  });

  it("không có khối ảnh bìa (D-97)", async () => {
    setup();
    await screen.findByRole("dialog");
    expect(screen.queryByText(/ảnh bìa/i)).toBeNull();
  });
});

describe("CreateItineraryDialog: chọn điểm đến và tên", () => {
  it("bấm điểm đến đóng khối Điểm đến, mở khối Tên và focus trigger Tên", async () => {
    const { user } = setup();
    await chooseDestination(user, "Đà Nẵng");
    expect(destinationTrigger().getAttribute("aria-expanded")).toBe("false");
    expect(nameTrigger().getAttribute("aria-expanded")).toBe("true");
    expect(document.activeElement).toBe(nameTrigger());
  });

  it.each([" ", "{Enter}"])("phím %j trên điểm đến chuyển khối", async (key) => {
    const { user } = setup();
    await ready();
    option("Hà Nội").focus();
    await user.keyboard(key);
    expect(nameTrigger().getAttribute("aria-expanded")).toBe("true");
  });

  it("đổi bằng mũi tên không chuyển khối", async () => {
    const { user } = setup();
    await ready();
    option("Đà Nẵng").focus();
    await user.keyboard("{ArrowDown}");
    expect(destinationTrigger().getAttribute("aria-expanded")).toBe("true");
  });

  it("tên đổi theo điểm đến; tên riêng thì giữ; xóa trắng rồi blur điền lại", async () => {
    const { user } = setup();
    await chooseDestination(user, "Lâm Đồng");
    expect(titleInput().value).toBe("Chuyến đi Lâm Đồng");
    await user.click(destinationTrigger());
    await chooseDestination(user, "Đà Nẵng");
    expect(titleInput().value).toBe("Chuyến đi Đà Nẵng");
    await user.clear(titleInput());
    await user.type(titleInput(), "Tên riêng");
    await user.click(destinationTrigger());
    await chooseDestination(user, "Hà Nội");
    expect(titleInput().value).toBe("Tên riêng");
    await user.clear(titleInput());
    await user.tab();
    expect(titleInput().value).toBe("Chuyến đi Hà Nội");
    expect(screen.queryByText("Vui lòng nhập tên chuyến đi.")).toBeNull();
  });
});

describe("CreateItineraryDialog: Enter không gửi form", () => {
  it("Enter trong ô Tên và ô tìm không gọi create", async () => {
    const { user } = setup();
    await user.type(screen.getByRole("searchbox", { name: "Tìm điểm đến" }), "da lat{Enter}");
    expect(h.create).not.toHaveBeenCalled();
    expect(nameTrigger().getAttribute("aria-expanded")).toBe("true");
    await user.type(titleInput(), "{Enter}");
    expect(h.create).not.toHaveBeenCalled();
  });

  it("Enter trên trigger vẫn mở khối", async () => {
    const { user } = setup();
    await ready();
    interestsTrigger().focus();
    await user.keyboard("{Enter}");
    expect(interestsTrigger().getAttribute("aria-expanded")).toBe("true");
  });
});

describe("CreateItineraryDialog: lỗi", () => {
  it("chưa chọn điểm đến: mở khối Điểm đến, hiện lỗi, focus dòng đầu nhóm Phổ biến, không gọi create", async () => {
    const { user } = setup();
    await user.click(nameTrigger());
    await user.click(submitButton());
    await waitFor(() => expect(destinationTrigger().getAttribute("aria-expanded")).toBe("true"));
    expect(screen.getAllByText("Vui lòng chọn điểm đến.").length).toBeGreaterThan(0);
    const popular = screen.getByRole("radiogroup", { name: "Phổ biến" });
    await waitFor(() => expect(popular.contains(document.activeElement)).toBe(true));
    expect(h.create).not.toHaveBeenCalled();
  });

  it("tên quá 100 ký tự: mở khối Tên, focus ô Tên, báo lỗi", async () => {
    const { user } = setup();
    await chooseDestination(user, "Đà Nẵng");
    await user.click(datesTrigger());
    fireEvent.change(screen.getByRole("textbox", { name: /Tên chuyến đi/, hidden: true }), { target: { value: "a".repeat(101) } });
    await user.click(submitButton());
    await waitFor(() => expect(nameTrigger().getAttribute("aria-expanded")).toBe("true"));
    await waitFor(() => expect(document.activeElement).toBe(titleInput()));
    expect(screen.getAllByText("Tên chuyến đi tối đa 100 ký tự.").length).toBeGreaterThan(0);
    expect(h.create).not.toHaveBeenCalled();
  });

  it("xóa trắng tên rồi gửi: blur điền lại tên mặc định nên vẫn gửi được (D-93)", async () => {
    const { user } = setup();
    await chooseDestination(user, "Đà Nẵng");
    await user.clear(titleInput());
    await user.click(submitButton());
    await waitFor(() => expect(h.create).toHaveBeenCalledTimes(1));
    expect(h.create.mock.calls[0]?.[0]).toMatchObject({ title: "Chuyến đi Đà Nẵng" });
  });

  it.each([
    ["Itinerary.DayCountOutOfRange", () => datesTrigger(), () => screen.getByRole("textbox", { name: /Số ngày/ })],
    ["Itinerary.InterestUnknown", () => interestsTrigger(), () => screen.getByRole("button", { name: "Lịch sử & Văn hóa" })],
    ["Itinerary.DestinationUnknown", () => destinationTrigger(), () => screen.getAllByRole("radio")[0] as HTMLElement],
  ])("lỗi BE %s mở khối lỗi và focus ô lỗi", async (code, blockTrigger, focusTarget) => {
    h.create.mockRejectedValueOnce(http(400, code, "x"));
    const { user } = setup();
    await chooseDestination(user, "Đà Nẵng");
    await user.click(submitButton());
    await waitFor(() => expect(blockTrigger().getAttribute("aria-expanded")).toBe("true"));
    await waitFor(() => expect(document.activeElement).toBe(focusTarget()));
  });

  it("lỗi 500 hiện InlineAlert, không toast, không điều hướng, khối đang mở giữ nguyên", async () => {
    const toasts = [vi.spyOn(notify, "success"), vi.spyOn(notify, "error")];
    h.create.mockRejectedValueOnce(http(500, null, null));
    const { user } = setup();
    await chooseDestination(user, "Đà Nẵng");
    await user.click(submitButton());
    await waitFor(() => expect(screen.getAllByRole("alert").length).toBeGreaterThan(0));
    expect(h.push).not.toHaveBeenCalled();
    expect(nameTrigger().getAttribute("aria-expanded")).toBe("true");
    for (const toast of toasts) expect(toast).not.toHaveBeenCalled();
  });
});

describe("CreateItineraryDialog: gửi", () => {
  it("gửi hợp lệ gọi create đúng một lần với 5 khóa, sở thích đúng thứ tự danh mục", async () => {
    const { user } = setup();
    await chooseDestination(user, "Đà Nẵng");
    await user.click(datesTrigger());
    fireEvent.change(screen.getByLabelText("Ngày khởi hành"), { target: { value: "2026-11-12" } });
    await user.click(interestsTrigger());
    await user.click(screen.getByRole("button", { name: "Mua sắm" }));
    await user.click(screen.getByRole("button", { name: "Thiên nhiên" }));
    await user.click(submitButton());
    await waitFor(() => expect(h.create).toHaveBeenCalledTimes(1));
    expect(h.create).toHaveBeenCalledWith({
      title: "Chuyến đi Đà Nẵng",
      destinationCode: "vn-da-nang",
      dayCount: 3,
      startDate: "2026-11-12",
      interests: ["nature", "shopping"],
    });
  });

  it("ngày khởi hành trống thì gửi null", async () => {
    const { user } = setup();
    await chooseDestination(user, "Hà Nội");
    await user.click(submitButton());
    await waitFor(() => expect(h.create).toHaveBeenCalledTimes(1));
    expect(h.create.mock.calls[0]?.[0]).toMatchObject({ startDate: null, interests: [] });
  });

  it("thành công: markEnteredFromList, vào editor, đóng modal, không toast", async () => {
    const toasts = [vi.spyOn(notify, "success"), vi.spyOn(notify, "error"), vi.spyOn(notify, "info")];
    const { user, onOpenChange } = setup();
    await chooseDestination(user, "Đà Nẵng");
    await user.click(submitButton());
    await waitFor(() => expect(h.push).toHaveBeenCalledWith(`/itineraries/${ID}/edit`));
    expect(enteredFromList()).toBe(true);
    expect(onOpenChange).toHaveBeenCalledWith(false);
    for (const toast of toasts) expect(toast).not.toHaveBeenCalled();
  });

  it("đang gửi: khóa mọi đường đóng và gửi lần hai", async () => {
    let resolve: (value: Itinerary) => void = () => undefined;
    h.create.mockReturnValueOnce(new Promise<Itinerary>((done) => (resolve = done)));
    const { user, onOpenChange } = setup();
    await chooseDestination(user, "Đà Nẵng");
    await user.click(submitButton());
    await screen.findByRole("button", { name: /Đang tạo/ });
    expect(nameTrigger().hasAttribute("data-disabled")).toBe(true);
    expect((screen.getByRole("button", { name: "Hủy" }) as HTMLButtonElement).disabled).toBe(true);
    await user.keyboard("{Escape}");
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
    fireEvent.submit(screen.getByRole("dialog").querySelector("form") as HTMLFormElement);
    expect(h.create).toHaveBeenCalledTimes(1);
    await act(async () => resolve(createdItinerary));
  });

  it("sau 5 giây đang gửi hiện thông báo máy chủ khởi động", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    h.create.mockReturnValueOnce(new Promise<Itinerary>(() => undefined));
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    installMatchMedia(true);
    render(
      <QueryClientProvider client={makeQueryClient()}>
        <Harness onOpenChange={vi.fn()} />
      </QueryClientProvider>,
    );
    await user.click(option("Đà Nẵng"));
    await user.click(submitButton());
    await screen.findByRole("button", { name: /Đang tạo/ });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5_100);
    });
    expect(screen.getByText(COLD_START_MESSAGE)).toBeTruthy();
  });
});

describe("CreateItineraryDialog: đóng và Esc", () => {
  it("Hủy đóng không hỏi; mở lại là form mới", async () => {
    const { user, onOpenChange } = setup();
    await chooseDestination(user, "Lâm Đồng");
    await user.click(screen.getByRole("button", { name: "Hủy" }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    await user.click(screen.getByRole("button", { name: "Mở lại" }));
    await screen.findByRole("dialog");
    expect(destinationTrigger().getAttribute("aria-expanded")).toBe("true");
    expect(nameTrigger().textContent).toContain("Chuyến đi mới");
    expect(datesTrigger().textContent).toContain("3 ngày");
    expect(interestsTrigger().textContent).toContain("Chưa chọn");
  });

  it("Esc trong ô tìm có chữ chỉ xóa chữ; ô trống thì đóng modal", async () => {
    const { user, onOpenChange } = setup();
    const search = screen.getByRole("searchbox", { name: "Tìm điểm đến" }) as HTMLInputElement;
    await user.type(search, "da");
    await user.keyboard("{Escape}");
    expect(search.value).toBe("");
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
    expect(screen.getByRole("dialog")).toBeTruthy();
    await user.keyboard("{Escape}");
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("dưới md render bằng Sheet và vẫn có chân form", async () => {
    setup({ wide: false });
    const sheet = await screen.findByRole("dialog", { name: "Lịch trình mới" });
    expect(sheet.getAttribute("data-sheet-position")).toBe("bottom");
    expect(submitButton()).toBeTruthy();
    expect(screen.getByRole("button", { name: "Hủy" })).toBeTruthy();
  });
});
