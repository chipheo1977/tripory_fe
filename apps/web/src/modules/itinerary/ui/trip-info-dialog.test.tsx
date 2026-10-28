import { makeApiError } from "@tripory/api-client";
import { parseCalendarDate, type Itinerary } from "@tripory/itinerary";
import { parseItineraryId, parseUserId } from "@tripory/shared-kernel";
import { notify } from "@tripory/ui-web";
import { QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { makeQueryClient } from "@/composition/query-client";
import { draftKey, draftStorage } from "./draft-storage";
import type { MetadataValues } from "./form-schemas";
import { createSaveStatusStore, SaveStatusProvider, type SaveStatusStore } from "./save-status";
import { TripInfoDialog } from "./trip-info-dialog";

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

import { sessionEvents } from "@/composition/session-events.client";

const ID = parseItineraryId("3f2a6c1e-8b7d-4e21-9c55-0a1b2c3d4e5f");
const OWNER = parseUserId("3f2504e0-4f89-11d3-9a0c-0305e82c3301");
const START = parseCalendarDate("2026-10-12");
if (ID === null || OWNER === null || START === null) throw new Error("dữ liệu mẫu phải hợp lệ");

const COVER = "https://img.test/da-lat.jpg";

const base: Itinerary = {
  id: ID,
  ownerId: OWNER,
  title: "Đà Lạt",
  description: "Săn mây",
  coverImageUrl: COVER,
  startDate: START,
  isPublic: false,
  totalDistanceKm: 0,
  days: [{ dayNumber: 1, subtitle: null, distanceKm: null }],
  waypoints: [],
};
const bare: Itinerary = { ...base, description: null, coverImageUrl: null, startDate: null };

const http = (status: number, code: string | null, message: string | null) =>
  makeApiError({ kind: "http", status, code, message });

const DRAFT_KEY = draftKey({ viewerId: OWNER, itineraryId: ID, kind: "metadata" });

const title = () => screen.getByLabelText("Tiêu đề") as HTMLInputElement;
const description = () => screen.getByLabelText("Mô tả") as HTMLTextAreaElement;
const startDate = () => screen.getByLabelText("Ngày khởi hành") as HTMLInputElement;
const cover = () => screen.getByLabelText("Ảnh bìa") as HTMLInputElement;
const save = () => screen.getByRole("button", { name: /^Lưu|Đang lưu/ });
const cancel = () => screen.getByRole("button", { name: "Hủy" });

const originalMatchMedia = window.matchMedia;
/** Mặc định desktop (Dialog); `false` cho Sheet. */
const setWide = (wide: boolean) => {
  window.matchMedia = ((query: string) =>
    ({
      matches: wide,
      media: query,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    }) as unknown as MediaQueryList) as typeof window.matchMedia;
};

function setup(
  props: Partial<{
    itinerary: Itinerary;
    restored: MetadataValues | null;
    onOpenChange: (open: boolean) => void;
    onDirtyChange: (dirty: boolean) => void;
    store: SaveStatusStore;
  }> = {},
) {
  const user = userEvent.setup();
  const onOpenChange = props.onOpenChange ?? vi.fn();
  const store = props.store ?? createSaveStatusStore();
  render(
    <QueryClientProvider client={makeQueryClient()}>
      <SaveStatusProvider store={store}>
        <TripInfoDialog
          itinerary={props.itinerary ?? base}
          onDirtyChange={props.onDirtyChange}
          onOpenChange={onOpenChange}
          open
          restored={props.restored}
          viewerId={OWNER}
        />
      </SaveStatusProvider>
    </QueryClientProvider>,
  );
  return { user, onOpenChange, store };
}

beforeEach(() => {
  vi.clearAllMocks();
  setWide(true);
  window.sessionStorage.clear();
  sessionEvents.rearmExpired();
  h.update.mockResolvedValue(undefined);
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  window.matchMedia = originalMatchMedia;
  window.sessionStorage.clear();
  sessionEvents.dispose();
});

it("opens with the title focused and fields filled from the itinerary", async () => {
  setup();
  expect(await screen.findByRole("dialog", { name: "Thông tin chuyến đi" })).toBeTruthy();
  await waitFor(() => expect(document.activeElement).toBe(title()));
  expect(title().value).toBe("Đà Lạt");
  expect(description().value).toBe("Săn mây");
  expect(startDate().value).toBe("2026-10-12");
  expect(startDate().type).toBe("date");
  expect(cover().value).toBe(COVER);
  expect(cover().type).toBe("url");
  expect(cover().getAttribute("inputmode")).toBe("url");
  expect(screen.getByText("Dán link ảnh bắt đầu bằng https://")).toBeTruthy();
});

it("fills null description, date and cover as empty strings", async () => {
  setup({ itinerary: bare });
  await screen.findByRole("dialog");
  expect(description().value).toBe("");
  expect(startDate().value).toBe("");
  expect(cover().value).toBe("");
  expect(screen.queryByRole("button", { name: "Xóa ngày" })).toBeNull();
  expect(screen.queryByRole("button", { name: "Xóa ảnh bìa" })).toBeNull();
});

it("saves the trimmed metadata, marks saved, closes without any toast", async () => {
  const toasts = [vi.spyOn(notify, "success"), vi.spyOn(notify, "error"), vi.spyOn(notify, "info")];
  window.sessionStorage.setItem(DRAFT_KEY, "{}");
  const { user, onOpenChange, store } = setup();
  await screen.findByRole("dialog");
  await user.clear(title());
  await user.type(title(), "  Đà Lạt 3N  ");
  await user.clear(description());
  await user.click(save());
  await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
  expect(h.update).toHaveBeenCalledTimes(1);
  expect(h.update).toHaveBeenCalledWith({
    title: "Đà Lạt 3N",
    description: null,
    startDate: START,
    coverImageUrl: COVER,
  });
  expect(store.getSnapshot().hasSaved).toBe(true);
  expect(window.sessionStorage.getItem(DRAFT_KEY)).toBeNull();
  for (const toast of toasts) expect(toast).not.toHaveBeenCalled();
});

it("locks while saving: busy label, no second submit, Hủy disabled, Esc keeps it open, closes when done", async () => {
  let resolve: () => void = () => undefined;
  h.update.mockReturnValue(new Promise<void>((r) => (resolve = r)));
  const { user, onOpenChange } = setup();
  await screen.findByRole("dialog");
  await user.click(save());
  const busy = await screen.findByRole("button", { name: /Đang lưu/ });
  expect(busy.textContent).toBe("Đang lưu…");
  expect(busy.getAttribute("aria-busy")).toBe("true");
  expect(title().readOnly).toBe(true);
  const cancelButton = cancel() as HTMLButtonElement;
  expect(cancelButton.hasAttribute("disabled") || cancelButton.getAttribute("aria-disabled") === "true").toBe(true);
  fireEvent.submit(document.querySelector("form") as HTMLFormElement);
  fireEvent.click(busy);
  fireEvent.click(cancelButton);
  fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
  await user.keyboard("{Escape}");
  expect(h.update).toHaveBeenCalledTimes(1);
  expect(onOpenChange).not.toHaveBeenCalled();
  await act(async () => resolve());
  await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
});

it("validates title, description and cover before calling the server", async () => {
  const { user } = setup({ itinerary: bare });
  await screen.findByRole("dialog");
  await user.clear(title());
  await user.click(save());
  expect(await screen.findByText("Vui lòng nhập tiêu đề.")).toBeTruthy();
  expect(title().getAttribute("aria-invalid")).toBe("true");

  await user.click(title());
  await user.paste("a".repeat(101));
  await user.click(save());
  expect(await screen.findByText("Tiêu đề tối đa 100 ký tự.")).toBeTruthy();

  await user.clear(title());
  await user.type(title(), "ok");
  await user.click(description());
  await user.paste("b".repeat(1001));
  await user.type(cover(), "http://img.test/a.jpg");
  await user.click(save());
  expect(await screen.findByText("Mô tả tối đa 1000 ký tự.")).toBeTruthy();
  expect(await screen.findByText("Link ảnh phải bắt đầu bằng https://.")).toBeTruthy();
  expect(h.update).not.toHaveBeenCalled();
});

it("shows the cover preview only after 400ms for a valid https URL, with no referrer", async () => {
  setup({ itinerary: bare });
  await screen.findByRole("dialog");
  vi.useFakeTimers();
  fireEvent.change(cover(), { target: { value: "https://img.test/new.jpg" } });
  await act(() => vi.advanceTimersByTimeAsync(399));
  expect(screen.queryByAltText("Xem trước ảnh bìa")).toBeNull();
  await act(() => vi.advanceTimersByTimeAsync(1));
  const preview = screen.getByAltText("Xem trước ảnh bìa") as HTMLImageElement;
  expect(preview.getAttribute("src")).toBe("https://img.test/new.jpg");
  expect(preview.getAttribute("referrerpolicy")).toBe("no-referrer");
  // URL không hợp lệ thì preview biến mất ngay, không chờ debounce.
  fireEvent.change(cover(), { target: { value: "http://img.test/new.jpg" } });
  expect(screen.queryByAltText("Xem trước ảnh bìa")).toBeNull();
});

it("never previews javascript:, data: or http: URLs", async () => {
  setup({ itinerary: bare });
  await screen.findByRole("dialog");
  vi.useFakeTimers();
  for (const value of ["javascript:alert(1)", "data:image/png;base64,AAAA", "http://img.test/a.jpg"]) {
    fireEvent.change(cover(), { target: { value } });
    await act(() => vi.advanceTimersByTimeAsync(1000));
    expect(screen.queryByAltText("Xem trước ảnh bìa")).toBeNull();
  }
});

it("falls back with the load-error copy but still saves the cover URL", async () => {
  const { user, onOpenChange } = setup({ itinerary: bare });
  await screen.findByRole("dialog");
  vi.useFakeTimers();
  fireEvent.change(cover(), { target: { value: "https://img.test/broken.jpg" } });
  await act(() => vi.advanceTimersByTimeAsync(400));
  fireEvent.error(screen.getByAltText("Xem trước ảnh bìa"));
  expect(screen.getByText("Không tải được ảnh từ link này")).toBeTruthy();
  expect(screen.queryByAltText("Xem trước ảnh bìa")).toBeNull();
  vi.useRealTimers();
  await user.click(save());
  await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
  expect(h.update).toHaveBeenCalledWith(expect.objectContaining({ coverImageUrl: "https://img.test/broken.jpg" }));
});

it("clears the date and the cover with their buttons and sends null", async () => {
  const { user } = setup();
  await screen.findByRole("dialog");
  await user.click(screen.getByRole("button", { name: "Xóa ngày" }));
  expect(startDate().value).toBe("");
  expect(screen.queryByRole("button", { name: "Xóa ngày" })).toBeNull();
  await user.click(screen.getByRole("button", { name: "Xóa ảnh bìa" }));
  expect(cover().value).toBe("");
  expect(screen.queryByRole("button", { name: "Xóa ảnh bìa" })).toBeNull();
  await user.click(save());
  await waitFor(() => expect(h.update).toHaveBeenCalledTimes(1));
  expect(h.update).toHaveBeenCalledWith({ title: "Đà Lạt", description: "Săn mây", startDate: null, coverImageUrl: null });
});

it("attaches ItineraryTitle.Empty from the server under the title and stays open without a toast", async () => {
  const errorToast = vi.spyOn(notify, "error");
  h.update.mockRejectedValue(http(400, "ItineraryTitle.Empty", "Title must not be empty"));
  const { user, onOpenChange } = setup();
  await screen.findByRole("dialog");
  await user.click(save());
  expect(await screen.findByText("Vui lòng nhập tiêu đề.")).toBeTruthy();
  expect(title().getAttribute("aria-invalid")).toBe("true");
  expect(screen.getByRole("dialog")).toBeTruthy();
  expect(onOpenChange).not.toHaveBeenCalled();
  expect(errorToast).not.toHaveBeenCalled();
});

it("shows other server errors in an InlineAlert, keeps the dialog open and allows retry", async () => {
  const errorToast = vi.spyOn(notify, "error");
  h.update.mockRejectedValueOnce(http(500, null, null));
  const { user, onOpenChange } = setup();
  await screen.findByRole("dialog");
  await user.click(save());
  const alert = await screen.findByRole("alert");
  expect(alert.textContent).toBeTruthy();
  expect(screen.getByRole("dialog")).toBeTruthy();
  expect(title().value).toBe("Đà Lạt");
  expect(errorToast).not.toHaveBeenCalled();
  expect(onOpenChange).not.toHaveBeenCalled();
  await user.click(save());
  await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
});

it("restores a draft with an info alert, then removes the draft on Hủy", async () => {
  window.sessionStorage.setItem(DRAFT_KEY, "{}");
  const restored: MetadataValues = { title: "Bản nháp", description: "", startDate: "", coverImageUrl: "" };
  const { user, onOpenChange } = setup({ restored });
  await screen.findByRole("dialog");
  expect(title().value).toBe("Bản nháp");
  expect(startDate().value).toBe("");
  expect(screen.getByText("Đã khôi phục nội dung chưa lưu").closest('[role="status"]')).not.toBeNull();
  await user.click(cancel());
  expect(onOpenChange).toHaveBeenCalledWith(false);
  expect(window.sessionStorage.getItem(DRAFT_KEY)).toBeNull();
  expect(h.update).not.toHaveBeenCalled();
});

it("shows no restore alert without a draft", async () => {
  setup();
  await screen.findByRole("dialog");
  expect(screen.queryByText("Đã khôi phục nội dung chưa lưu")).toBeNull();
});

it("saves the form values as a draft when the session expires", async () => {
  const { user } = setup();
  await screen.findByRole("dialog");
  await user.clear(title());
  await user.type(title(), "Chưa lưu");
  act(() => sessionEvents.emitExpired());
  const raw = JSON.parse(window.sessionStorage.getItem(DRAFT_KEY) ?? "null") as { values: MetadataValues } | null;
  expect(raw?.values).toEqual({ title: "Chưa lưu", description: "Săn mây", startDate: "2026-10-12", coverImageUrl: COVER });
  expect(draftStorage.findFirst(`tripory:draft:v1:${OWNER}:${ID}:`)).toEqual({ key: DRAFT_KEY, kind: "metadata" });
});

it("reports dirtiness through onDirtyChange", async () => {
  const onDirtyChange = vi.fn();
  const { user } = setup({ onDirtyChange });
  await screen.findByRole("dialog");
  expect(onDirtyChange).toHaveBeenLastCalledWith(false);
  await user.type(title(), "x");
  await waitFor(() => expect(onDirtyChange).toHaveBeenLastCalledWith(true));
  await user.click(cancel());
  await waitFor(() => expect(onDirtyChange).toHaveBeenLastCalledWith(false));
});

it("renders as a Sheet below md and keeps the title focused", async () => {
  setWide(false);
  setup();
  const sheet = await screen.findByRole("dialog", { name: "Thông tin chuyến đi" });
  expect(sheet.getAttribute("data-sheet-position")).toBe("bottom");
  await waitFor(() => expect(document.activeElement).toBe(title()));
});
