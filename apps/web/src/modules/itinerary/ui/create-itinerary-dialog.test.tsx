import { makeApiError } from "@tripory/api-client";
import type { Itinerary } from "@tripory/itinerary";
import { parseItineraryId, parseUserId } from "@tripory/shared-kernel";
import { notify } from "@tripory/ui-web";
import { QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
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
        create: (input: { title: string }) => h.create(input),
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

const created = (title: string): Itinerary => ({
  id: ID,
  ownerId: OWNER,
  title,
  description: null,
  coverImageUrl: null,
  startDate: null,
  isPublic: false,
  totalDistanceKm: 0,
  days: [{ dayNumber: 1, subtitle: null, distanceKm: null }],
  waypoints: [],
});

const http = (status: number, code: string | null, message: string | null) =>
  makeApiError({ kind: "http", status, code, message });

const input = () => screen.getByLabelText("Tiêu đề") as HTMLInputElement;
const submit = () => screen.getByRole("button", { name: /^Tạo lịch trình|Đang tạo/ });

function setup(onOpenChange: (open: boolean) => void = vi.fn()) {
  const user = userEvent.setup();
  render(
    <QueryClientProvider client={makeQueryClient()}>
      <CreateItineraryDialog onOpenChange={onOpenChange} open />
    </QueryClientProvider>,
  );
  return { user, onOpenChange };
}

beforeEach(() => {
  vi.clearAllMocks();
  clearEnteredFromList();
  h.create.mockImplementation(async (value: { title: string }) => created(value.title));
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

it("opens with the title prefilled, fully selected and focused", async () => {
  setup();
  expect(await screen.findByRole("dialog", { name: "Lịch trình mới" })).toBeTruthy();
  expect(input().value).toBe("Chuyến đi mới");
  await waitFor(() => expect(document.activeElement).toBe(input()));
  await waitFor(() => {
    expect(input().selectionStart).toBe(0);
    expect(input().selectionEnd).toBe(13);
  });
  expect(screen.queryByText("(bắt buộc)")).toBeNull();
});

it("submits on Enter with the trimmed title, marks the list entry and navigates without a toast", async () => {
  const toasts = [vi.spyOn(notify, "success"), vi.spyOn(notify, "error"), vi.spyOn(notify, "info")];
  const { user } = setup();
  await user.clear(input());
  await user.type(input(), "  Hà Nội 2 ngày  {Enter}");
  await waitFor(() => expect(h.push).toHaveBeenCalledTimes(1));
  expect(h.create).toHaveBeenCalledTimes(1);
  expect(h.create).toHaveBeenCalledWith({ title: "Hà Nội 2 ngày" });
  expect(h.push).toHaveBeenCalledWith(`/itineraries/${ID}/edit`);
  expect(enteredFromList()).toBe(true);
  for (const toast of toasts) expect(toast).not.toHaveBeenCalled();
});

it("keeps the form locked after success so a second create cannot start while navigating", async () => {
  const { user } = setup();
  await user.click(submit());
  await waitFor(() => expect(h.push).toHaveBeenCalledTimes(1));
  expect(input().readOnly).toBe(true);
  expect(submit().getAttribute("aria-busy")).toBe("true");
  await user.type(input(), "{Enter}");
  fireEvent.click(submit());
  expect(h.create).toHaveBeenCalledTimes(1);
});

it("rejects a blank title with the locked copy and does not call the server", async () => {
  const { user } = setup();
  await user.clear(input());
  await user.type(input(), "   {Enter}");
  expect(await screen.findByText("Vui lòng nhập tiêu đề.")).toBeTruthy();
  expect(input().getAttribute("aria-invalid")).toBe("true");
  expect(h.create).not.toHaveBeenCalled();
  expect(h.push).not.toHaveBeenCalled();
});

it("rejects a title over 100 raw characters", async () => {
  const { user } = setup();
  await user.clear(input());
  await user.click(input());
  await user.paste(`${"a".repeat(99)}  `);
  await user.keyboard("{Enter}");
  expect(await screen.findByText("Tiêu đề tối đa 100 ký tự.")).toBeTruthy();
  expect(h.create).not.toHaveBeenCalled();
});

it("locks while pending: busy label, no second call, Hủy disabled, Esc keeps it open, cold start after 5s", async () => {
  let resolve: (value: Itinerary) => void = () => undefined;
  h.create.mockReturnValue(new Promise<Itinerary>((r) => (resolve = r)));
  const { onOpenChange } = setup();
  await screen.findByRole("dialog");
  vi.useFakeTimers();
  const form = document.querySelector("form") as HTMLFormElement;
  fireEvent.submit(form);
  await act(() => vi.advanceTimersByTimeAsync(0));

  const busy = screen.getByRole("button", { name: /Đang tạo/ });
  expect(busy.getAttribute("aria-busy")).toBe("true");
  expect(busy.textContent).toBe("Đang tạo…");
  expect(input().readOnly).toBe(true);
  const cancel = screen.getByRole("button", { name: "Hủy" }) as HTMLButtonElement;
  expect(cancel.hasAttribute("disabled") || cancel.getAttribute("aria-disabled") === "true").toBe(true);

  fireEvent.submit(form);
  fireEvent.click(busy);
  fireEvent.click(cancel);
  fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
  await act(() => vi.advanceTimersByTimeAsync(0));
  expect(h.create).toHaveBeenCalledTimes(1);
  expect(onOpenChange).not.toHaveBeenCalled();

  expect(screen.queryByText("Máy chủ đang khởi động, có thể mất tới 30 giây…")).toBeNull();
  await act(() => vi.advanceTimersByTimeAsync(5_000));
  expect(screen.getByText("Máy chủ đang khởi động, có thể mất tới 30 giây…")).toBeTruthy();

  await act(async () => resolve(created("Chuyến đi mới")));
  expect(h.push).toHaveBeenCalledTimes(1);
});

it("closes through Hủy when idle", async () => {
  const { user, onOpenChange } = setup();
  await user.click(await screen.findByRole("button", { name: "Hủy" }));
  expect(onOpenChange).toHaveBeenCalledWith(false);
});

it("attaches ItineraryTitle.Empty from the server under the field and stays open", async () => {
  const errorToast = vi.spyOn(notify, "error");
  h.create.mockRejectedValue(http(400, "ItineraryTitle.Empty", "Title must not be empty"));
  const { user } = setup();
  await user.click(submit());
  expect(await screen.findByText("Vui lòng nhập tiêu đề.")).toBeTruthy();
  expect(input().getAttribute("aria-invalid")).toBe("true");
  expect(document.activeElement).toBe(input());
  expect(screen.getByRole("dialog")).toBeTruthy();
  expect(h.push).not.toHaveBeenCalled();
  expect(errorToast).not.toHaveBeenCalled();
});

it("shows the generic sentence in an InlineAlert for a 500 and keeps the dialog open", async () => {
  const errorToast = vi.spyOn(notify, "error");
  h.create.mockRejectedValue(http(500, null, null));
  const { user } = setup();
  await user.click(submit());
  const alert = await screen.findByRole("alert");
  expect(alert.textContent).toBeTruthy();
  expect(screen.getByRole("dialog")).toBeTruthy();
  expect(input().value).toBe("Chuyến đi mới");
  expect(errorToast).not.toHaveBeenCalled();
  expect(h.push).not.toHaveBeenCalled();
  // Gửi lại được sau lỗi.
  h.create.mockResolvedValue(created("Chuyến đi mới"));
  await user.click(submit());
  await waitFor(() => expect(h.push).toHaveBeenCalledTimes(1));
});
