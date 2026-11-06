import { QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { makeApiError } from "@tripory/api-client";
import type { Place, Waypoint } from "@tripory/itinerary";
import { createWgs84Coordinate, parseItineraryId, parseUserId } from "@tripory/shared-kernel";
import { notify } from "@tripory/ui-web";
import { useState } from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { makeQueryClient } from "@/composition/query-client";
import { draftKey, draftStorage } from "./draft-storage";
import type { WaypointValues } from "./form-schemas";
import { LOCATION_NO_COORDINATE } from "./location-field";
import { createSaveStatusStore, SaveStatusProvider, type SaveStatusStore } from "./save-status";
import { WaypointFormDialog, type WaypointFormMode } from "./waypoint-form-dialog";

const h = vi.hoisted(() => ({
  add: vi.fn(),
  update: vi.fn(),
  resolve: vi.fn(),
  search: vi.fn(),
  suggest: vi.fn(),
  reverse: vi.fn(),
}));

// Lookup giả thay BFF `/api/places/*`: test không bao giờ gọi Photon/Nominatim thật.
vi.mock("@/composition/places.client", async () => {
  const { createPlaceHooks } = await import("@tripory/itinerary/react");
  return {
    places: createPlaceHooks({
      search: (query) => h.search(query),
      suggest: (code) => h.suggest(code),
      reverse: (coordinate) => h.reverse(coordinate),
    }),
  };
});

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
        addWaypoint: (_id: string, input: unknown) => h.add(input),
        updateWaypoint: (_id: string, waypointId: string, input: unknown) => h.update(waypointId, input),
        deleteWaypoint: unused,
        reorderWaypoints: unused,
        setDaySubtitle: unused,
      },
      shortLinks: { resolve: (url: string) => h.resolve(url) },
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
const COORDINATE = createWgs84Coordinate({ latitude: 10.77691234, longitude: 106.70091234 });
if (ID === null || OWNER === null || COORDINATE === null) throw new Error("dữ liệu mẫu phải hợp lệ");

const VIEWER: string = OWNER;
const ITINERARY_ID = ID;
const SAVED: Waypoint = {
  id: "wp-1",
  dayNumber: 1,
  orderIndex: 0,
  name: "Chợ Bến Thành",
  address: "Quận 1",
  notes: "Ăn trưa",
  coordinate: COORDINATE,
};

const POI = "https://www.google.com/maps/place/Brandenburg+Gate,+Pariser+Platz,+10117+Berlin,+Germany/";
const SHORT = "https://maps.app.goo.gl/abc";
const SEARCH = "https://www.google.com/maps/search/29.996966,+68.748251";
const COORDS_INPUT = "10.7769, 106.7009";

const http = (status: number, code: string | null, message: string | null) =>
  makeApiError({ kind: "http", status, code, message });

const nameInput = () => screen.getByLabelText(/^Tên/) as HTMLInputElement;
const locationInput = () => screen.getByLabelText(/^Vị trí/) as HTMLInputElement;
const addressInput = () => screen.getByLabelText("Địa chỉ") as HTMLInputElement;
const notesInput = () => screen.getByLabelText("Ghi chú") as HTMLTextAreaElement;
const submitButton = () => screen.getByRole("button", { name: /^Thêm điểm đến$|^Lưu$|^Đang (thêm|lưu)/ });
const set = (element: HTMLElement, value: string) => fireEvent.change(element, { target: { value } });
const searchInput = () => screen.getByRole("combobox", { name: "Tìm địa điểm" }) as HTMLInputElement;
/** Form thêm mở ở chế độ tìm (D-150): chuyển sang ô tọa độ/link cũ trước khi dán. */
const switchToManual = () => fireEvent.click(screen.getByRole("button", { name: "Nhập tọa độ thủ công" }));

const place = (
  id: string,
  name: string | null,
  address: string | null,
  latitude: number,
  longitude: number,
): Place => ({
  id,
  name,
  address,
  coordinate: { latitude, longitude },
  category: "attraction",
  countryCode: "VN",
});

const CRAZY_HOUSE = place("W1", "Crazy House", "3 Huỳnh Thúc Kháng, Xuân Hương, Đà Lạt, Lâm Đồng", 11.93508912, 108.43071634);
const HO_XUAN_HUONG = place("W2", "Hồ Xuân Hương", "Xuân Hương, Đà Lạt, Lâm Đồng", 11.9418, 108.4413);
const STREET = place("W9", null, "Hùng Vương, Xuân Hương, Đà Lạt, Lâm Đồng", 11.9404, 108.4583);

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

function setup(
  props: Partial<{
    mode: WaypointFormMode;
    restored: WaypointValues | null;
    onDirtyChange: (dirty: boolean) => void;
    store: SaveStatusStore;
    destinationCode: string | null;
  }> = {},
) {
  const user = userEvent.setup();
  const onClose = vi.fn();
  const onAdded = vi.fn();
  const onUpdated = vi.fn();
  const onDeleteRequested = vi.fn();
  const store = props.store ?? createSaveStatusStore();
  function Harness() {
    const [mode, setMode] = useState<WaypointFormMode | null>(props.mode ?? { kind: "add", dayNumber: 2 });
    return (
      <WaypointFormDialog
        destinationCode={props.destinationCode}
        itineraryId={ITINERARY_ID}
        mode={mode}
        onAdded={onAdded}
        onClose={() => {
          setMode(null);
          onClose();
        }}
        onDeleteRequested={onDeleteRequested}
        onDirtyChange={props.onDirtyChange}
        onUpdated={onUpdated}
        restored={props.restored}
        viewerId={VIEWER}
      />
    );
  }
  render(
    <QueryClientProvider client={makeQueryClient()}>
      <SaveStatusProvider store={store}>
        <Harness />
      </SaveStatusProvider>
    </QueryClientProvider>,
  );
  return { user, onClose, onAdded, onUpdated, onDeleteRequested, store };
}

beforeEach(() => {
  vi.clearAllMocks();
  setWide(true);
  window.sessionStorage.clear();
  sessionEvents.rearmExpired();
  h.add.mockImplementation((input: { dayNumber: number; name: string }) =>
    Promise.resolve({ ...SAVED, id: "wp-new", dayNumber: input.dayNumber, name: input.name }),
  );
  h.update.mockResolvedValue(undefined);
  h.suggest.mockResolvedValue([CRAZY_HOUSE, HO_XUAN_HUONG]);
  h.search.mockResolvedValue([HO_XUAN_HUONG]);
  h.reverse.mockResolvedValue(null);
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  window.matchMedia = originalMatchMedia;
  window.sessionStorage.clear();
  sessionEvents.dispose();
});

it("opens an add form for the day with fields in order and the name focused", async () => {
  setup();
  expect(await screen.findByRole("dialog", { name: "Thêm điểm đến vào Ngày 2" })).toBeTruthy();
  await waitFor(() => expect(document.activeElement).toBe(nameInput()));
  const form = screen.getByRole("dialog").querySelector("form") as HTMLFormElement;
  const labels = [...form.querySelectorAll("label")].map((label) => label.textContent ?? "");
  expect(labels).toEqual(["Tên*(bắt buộc)", "Vị trí*(bắt buộc)", "Địa chỉ", "Ghi chú"]);
  // D-150: thêm mới mở ở chế độ tìm địa điểm, ô tọa độ cũ là đường phụ.
  expect(searchInput()).toBeTruthy();
  expect(screen.queryByText("Dán tọa độ (ví dụ 10.7769, 106.7009) hoặc link Google Maps.")).toBeNull();
  expect(screen.getByRole("button", { name: "Nhập tọa độ thủ công" })).toBeTruthy();
  expect(screen.getByRole("button", { name: "Thêm điểm đến" })).toBeTruthy();
  expect(screen.queryByRole("button", { name: "Xóa điểm đến" })).toBeNull();
  expect(screen.getByRole("dialog").querySelector("input[type=date]")).toBeNull();
});

it("opens an edit form filled from the waypoint, with the coordinate already received and no day field", async () => {
  setup({ mode: { kind: "edit", waypoint: SAVED } });
  expect(await screen.findByRole("dialog", { name: "Sửa điểm đến" })).toBeTruthy();
  expect(nameInput().value).toBe("Chợ Bến Thành");
  expect(locationInput().value).toBe("10.7769, 106.7009");
  expect(addressInput().value).toBe("Quận 1");
  expect(notesInput().value).toBe("Ăn trưa");
  expect(screen.getByText("Đã nhận: 10.7769, 106.7009")).toBeTruthy();
  expect(screen.getByRole("button", { name: "Lưu" })).toBeTruthy();
  expect(screen.getByRole("button", { name: "Xóa điểm đến" })).toBeTruthy();
  expect(screen.getByRole("dialog").querySelector("input[type=date]")).toBeNull();
});

it("closes the edit form and requests deletion without sending anything", async () => {
  const { user, onClose, onDeleteRequested } = setup({ mode: { kind: "edit", waypoint: SAVED } });
  await screen.findByRole("dialog");
  await user.click(screen.getByRole("button", { name: "Xóa điểm đến" }));
  expect(onDeleteRequested).toHaveBeenCalledTimes(1);
  expect(onDeleteRequested).toHaveBeenCalledWith(SAVED);
  expect(onClose).toHaveBeenCalledTimes(1);
  expect(h.update).not.toHaveBeenCalled();
  expect(h.add).not.toHaveBeenCalled();
});

it("fills an empty name and address from a place link and explains where the name came from", async () => {
  setup();
  await screen.findByRole("dialog");
  switchToManual();
  set(locationInput(), POI);
  await waitFor(() => expect(nameInput().value).toBe("Brandenburg Gate"));
  expect(addressInput().value).toBe("Pariser Platz, 10117 Berlin, Germany");
  expect(screen.getByText("Đã lấy tên từ link, bạn có thể sửa.")).toBeTruthy();
  // D-48: link không có tọa độ vẫn là lỗi.
  fireEvent.blur(locationInput());
  expect(await screen.findByText(LOCATION_NO_COORDINATE)).toBeTruthy();
});

it("does not overwrite a name or address the user already typed", async () => {
  setup();
  await screen.findByRole("dialog");
  set(nameInput(), "Cổng Brandenburg");
  set(addressInput(), "Berlin");
  switchToManual();
  set(locationInput(), POI);
  await screen.findByText(/Link này chỉ có tên địa điểm/, undefined, { timeout: 2000 }).catch(() => null);
  expect(nameInput().value).toBe("Cổng Brandenburg");
  expect(addressInput().value).toBe("Berlin");
  expect(screen.queryByText("Đã lấy tên từ link, bạn có thể sửa.")).toBeNull();
});

it("shows the location error under the field, focuses it and sends nothing when the location cannot be read", async () => {
  const { user } = setup();
  await screen.findByRole("dialog");
  set(nameInput(), "Chợ Bến Thành");
  switchToManual();
  set(locationInput(), "abc");
  await user.click(submitButton());
  expect(await screen.findByText(/Không đọc được vị trí/)).toBeTruthy();
  expect(h.add).not.toHaveBeenCalled();
  await waitFor(() => expect(document.activeElement).toBe(locationInput()));
});

it("shows the required messages for empty name and location on submit", async () => {
  const { user } = setup();
  await screen.findByRole("dialog");
  await user.click(submitButton());
  expect(await screen.findByText("Vui lòng nhập tên điểm đến.")).toBeTruthy();
  expect(screen.getByText("Vui lòng chọn địa điểm hoặc nhập tọa độ.")).toBeTruthy();
  await waitFor(() => expect(document.activeElement).toBe(nameInput()));
  expect(h.add).not.toHaveBeenCalled();
});

it("adds a waypoint with trimmed values, closes without a toast and reports it", async () => {
  const toast = vi.spyOn(notify, "success");
  const { user, onAdded, onClose, store } = setup();
  await screen.findByRole("dialog");
  set(nameInput(), "  Chợ Bến Thành  ");
  switchToManual();
  set(locationInput(), COORDS_INPUT);
  set(notesInput(), "   ");
  await user.click(submitButton());
  await waitFor(() => expect(onAdded).toHaveBeenCalledTimes(1));
  expect(h.add).toHaveBeenCalledTimes(1);
  const sent = h.add.mock.calls[0]?.[0] as { dayNumber: number; name: string; address: string | null; notes: string | null; coordinate: unknown };
  expect(sent.dayNumber).toBe(2);
  expect(sent.name).toBe("Chợ Bến Thành");
  expect(sent.address).toBeNull();
  expect(sent.notes).toBeNull();
  expect(sent.coordinate).toEqual({ latitude: 10.7769, longitude: 106.7009 });
  expect(onAdded.mock.calls[0]?.[0]).toMatchObject({ id: "wp-new", dayNumber: 2, name: "Chợ Bến Thành" });
  expect(onClose).toHaveBeenCalledTimes(1);
  expect(toast).not.toHaveBeenCalled();
  expect(store.getSnapshot().hasSaved).toBe(true);
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
});

it("resolves a pasted short link at submit time and sends its coordinate", async () => {
  h.resolve.mockResolvedValue(SEARCH);
  const { user, onAdded } = setup();
  await screen.findByRole("dialog");
  set(nameInput(), "Điểm lạ");
  switchToManual();
  set(locationInput(), SHORT);
  await user.click(submitButton());
  await waitFor(() => expect(onAdded).toHaveBeenCalledTimes(1));
  expect(h.resolve).toHaveBeenCalledTimes(1);
  const sent = h.add.mock.calls[0]?.[0] as { coordinate: { latitude: number; longitude: number } };
  expect(sent.coordinate).toEqual({ latitude: 29.996966, longitude: 68.748251 });
});

it("keeps the form open with the resolve error when a short link cannot be opened", async () => {
  h.resolve.mockRejectedValue(new Error("boom"));
  const { user, onClose } = setup();
  await screen.findByRole("dialog");
  set(nameInput(), "Điểm lạ");
  switchToManual();
  set(locationInput(), SHORT);
  await user.click(submitButton());
  expect(await screen.findByText("Không mở được link rút gọn này. Thử dán link đầy đủ hoặc tọa độ.")).toBeTruthy();
  expect(h.add).not.toHaveBeenCalled();
  expect(onClose).not.toHaveBeenCalled();
});

it("saves an edit and keeps the full stored coordinate when the location was not touched", async () => {
  const { user, onUpdated, onClose } = setup({ mode: { kind: "edit", waypoint: SAVED } });
  await screen.findByRole("dialog");
  set(nameInput(), "Chợ Bến Thành mới");
  await user.click(submitButton());
  await waitFor(() => expect(onUpdated).toHaveBeenCalledWith("wp-1", COORDINATE));
  expect(h.update).toHaveBeenCalledTimes(1);
  expect(h.update).toHaveBeenCalledWith("wp-1", {
    name: "Chợ Bến Thành mới",
    address: "Quận 1",
    notes: "Ăn trưa",
    coordinate: COORDINATE,
  });
  expect(onClose).toHaveBeenCalledTimes(1);
});

it("sends the new coordinate when the location is edited", async () => {
  const { user, onUpdated } = setup({ mode: { kind: "edit", waypoint: SAVED } });
  await screen.findByRole("dialog");
  set(locationInput(), "21.0285, 105.8542");
  await user.click(submitButton());
  await waitFor(() => expect(onUpdated).toHaveBeenCalledTimes(1));
  expect((h.update.mock.calls[0]?.[1] as { coordinate: unknown }).coordinate).toEqual({
    latitude: 21.0285,
    longitude: 105.8542,
  });
});

it("puts a backend coordinate error under the location field and keeps the form open", async () => {
  h.add.mockRejectedValue(http(400, "Coordinate.InvalidLatitude", "Vĩ độ không hợp lệ."));
  const { user, onClose } = setup();
  await screen.findByRole("dialog");
  set(nameInput(), "Chợ");
  switchToManual();
  set(locationInput(), COORDS_INPUT);
  await user.click(submitButton());
  expect(await screen.findByText(/Vĩ độ/)).toBeTruthy();
  expect(onClose).not.toHaveBeenCalled();
  expect(screen.getByRole("dialog")).toBeTruthy();
  expect(locationInput().getAttribute("aria-invalid")).toBe("true");
});

it("shows an inline alert for an unexpected server error and keeps the form open with its values", async () => {
  h.add.mockRejectedValue(http(500, null, null));
  const { user, onClose } = setup();
  await screen.findByRole("dialog");
  set(nameInput(), "Chợ");
  switchToManual();
  set(locationInput(), COORDS_INPUT);
  await user.click(submitButton());
  expect(await screen.findByRole("alert")).toBeTruthy();
  expect(onClose).not.toHaveBeenCalled();
  expect(nameInput().value).toBe("Chợ");
  expect(locationInput().value).toBe(COORDS_INPUT);
});

it("rejects a name over 200, an address over 500 and notes over 2000 characters", async () => {
  const { user } = setup();
  await screen.findByRole("dialog");
  set(nameInput(), "a".repeat(201));
  switchToManual();
  set(locationInput(), COORDS_INPUT);
  set(addressInput(), "b".repeat(501));
  set(notesInput(), "c".repeat(2001));
  await user.click(submitButton());
  expect(await screen.findByText("Tên điểm đến tối đa 200 ký tự.")).toBeTruthy();
  expect(screen.getByText("Địa chỉ tối đa 500 ký tự.")).toBeTruthy();
  expect(screen.getByText("Ghi chú tối đa 2000 ký tự.")).toBeTruthy();
  expect(h.add).not.toHaveBeenCalled();
});

it("fills restored values, shows the restore notice and drops the draft on cancel", async () => {
  const key = draftKey({ viewerId: VIEWER, itineraryId: ITINERARY_ID, kind: "add:2" });
  draftStorage.save(key, { name: "x" });
  const { user, onClose } = setup({
    restored: { name: "Bản nháp", location: COORDS_INPUT, address: "Đường 1", notes: "ghi chú" },
  });
  await screen.findByRole("dialog");
  expect(screen.getByText("Đã khôi phục nội dung chưa lưu")).toBeTruthy();
  expect(nameInput().value).toBe("Bản nháp");
  expect(locationInput().value).toBe(COORDS_INPUT);
  expect(addressInput().value).toBe("Đường 1");
  expect(notesInput().value).toBe("ghi chú");
  expect(screen.getByText("Đã nhận: 10.7769, 106.7009")).toBeTruthy();
  await user.click(screen.getByRole("button", { name: "Hủy" }));
  expect(onClose).toHaveBeenCalledTimes(1);
  expect(window.sessionStorage.getItem(key)).toBeNull();
});

it("does not show the restore notice for a fresh form", async () => {
  setup();
  await screen.findByRole("dialog");
  expect(screen.queryByText("Đã khôi phục nội dung chưa lưu")).toBeNull();
});

it("reports dirty state to the editor", async () => {
  const onDirtyChange = vi.fn();
  setup({ onDirtyChange });
  await screen.findByRole("dialog");
  set(nameInput(), "Chợ");
  await waitFor(() => expect(onDirtyChange).toHaveBeenLastCalledWith(true));
});

it("does not close on a scrim click", async () => {
  const user = userEvent.setup();
  const { onClose } = setup();
  await screen.findByRole("dialog");
  await user.click(document.querySelector("[data-dialog-backdrop]") as HTMLElement);
  expect(onClose).not.toHaveBeenCalled();
  expect(screen.getByRole("dialog")).toBeTruthy();
});

it("cannot be closed while sending", async () => {
  let release: () => void = () => undefined;
  h.add.mockImplementation(
    (input: { dayNumber: number; name: string }) =>
      new Promise((resolve) => {
        release = () => resolve({ ...SAVED, id: "wp-new", dayNumber: input.dayNumber, name: input.name });
      }),
  );
  const { user, onClose } = setup();
  await screen.findByRole("dialog");
  set(nameInput(), "Chợ");
  switchToManual();
  set(locationInput(), COORDS_INPUT);
  await user.click(submitButton());
  await waitFor(() => expect(h.add).toHaveBeenCalledTimes(1));
  await user.keyboard("{Escape}");
  fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
  fireEvent.click(screen.getByRole("button", { name: "Hủy" }));
  expect(onClose).not.toHaveBeenCalled();
  expect(screen.getByRole("dialog")).toBeTruthy();
  expect(screen.getByRole("button", { name: "Đang thêm…" })).toBeTruthy();
  await act(async () => {
    release();
  });
  await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
});

it("uses a bottom sheet below the md breakpoint with the same fields", async () => {
  setWide(false);
  setup();
  expect(await screen.findByRole("dialog", { name: "Thêm điểm đến vào Ngày 2" })).toBeTruthy();
  expect(nameInput()).toBeTruthy();
  expect(searchInput()).toBeTruthy();
  switchToManual();
  expect(locationInput()).toBeTruthy();
});

it("closes the bottom sheet with the X button like a swipe down", async () => {
  setWide(false);
  const { user, onClose } = setup();
  await screen.findByRole("dialog", { name: "Thêm điểm đến vào Ngày 2" });
  await user.click(screen.getByRole("button", { name: "Đóng" }));
  await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
});

it("disables the sheet X button while sending", async () => {
  setWide(false);
  h.add.mockImplementation(() => new Promise(() => undefined));
  const { user, onClose } = setup();
  await screen.findByRole("dialog");
  set(nameInput(), "Chợ");
  switchToManual();
  set(locationInput(), COORDS_INPUT);
  await user.click(submitButton());
  await waitFor(() => expect(h.add).toHaveBeenCalledTimes(1));
  const close = screen.getByRole("button", { name: "Đóng" }) as HTMLButtonElement;
  expect(close.disabled).toBe(true);
  fireEvent.click(close);
  expect(onClose).not.toHaveBeenCalled();
  expect(screen.getByRole("dialog")).toBeTruthy();
});

it("has no sheet X button in the desktop dialog", async () => {
  setup();
  await screen.findByRole("dialog");
  expect(screen.queryByRole("button", { name: "Đóng" })).toBeNull();
});

const OVERVIEW_MODE: WaypointFormMode = {
  kind: "add",
  dayNumber: 3,
  dayChoices: [
    { dayNumber: 1, subtitle: null },
    { dayNumber: 2, subtitle: "Phố cổ" },
    { dayNumber: 3, subtitle: null },
  ],
};
const dayTrigger = () => screen.getByRole("combobox", { name: "Ngày" });

it("opened from Overview shows a Day field above the name, defaulting to the last day, with the name focused", async () => {
  setup({ mode: OVERVIEW_MODE });
  expect(await screen.findByRole("dialog", { name: "Thêm điểm đến" })).toBeTruthy();
  await waitFor(() => expect(document.activeElement).toBe(nameInput()));
  expect(dayTrigger().textContent).toContain("Ngày 3");
  const form = screen.getByRole("dialog").querySelector("form") as HTMLFormElement;
  const labels = [...form.querySelectorAll("label")].map((label) => label.textContent ?? "");
  expect(labels[0]).toBe("Ngày");
  expect(labels.indexOf("Ngày")).toBeLessThan(labels.findIndex((label) => label.startsWith("Tên")));
  expect(dayTrigger().compareDocumentPosition(nameInput()) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
});

it("lists every day with its subtitle and sends the chosen day", async () => {
  const { user, onAdded } = setup({ mode: OVERVIEW_MODE });
  await screen.findByRole("dialog");
  await user.click(dayTrigger());
  const options = (await screen.findAllByRole("option")).map((option) => option.textContent);
  expect(options).toEqual(["Ngày 1", "Ngày 2 · Phố cổ", "Ngày 3"]);
  await user.click(screen.getByRole("option", { name: "Ngày 1" }));
  expect(dayTrigger().textContent).toContain("Ngày 1");
  set(nameInput(), "Chợ");
  switchToManual();
  set(locationInput(), COORDS_INPUT);
  await user.click(submitButton());
  await waitFor(() => expect(h.add).toHaveBeenCalledTimes(1));
  expect(h.add.mock.calls[0]?.[0]).toMatchObject({ dayNumber: 1, name: "Chợ" });
  await waitFor(() => expect(onAdded).toHaveBeenCalledTimes(1));
});

it("keeps the default (last) day when the user does not touch the field", async () => {
  const { user } = setup({ mode: OVERVIEW_MODE });
  await screen.findByRole("dialog");
  set(nameInput(), "Chợ");
  switchToManual();
  set(locationInput(), COORDS_INPUT);
  await user.click(submitButton());
  await waitFor(() => expect(h.add).toHaveBeenCalledTimes(1));
  expect(h.add.mock.calls[0]?.[0]).toMatchObject({ dayNumber: 3 });
});

it("saves the expired-session draft under the chosen day, not the default one", async () => {
  const { user } = setup({ mode: OVERVIEW_MODE });
  await screen.findByRole("dialog");
  await user.click(dayTrigger());
  await user.click(await screen.findByRole("option", { name: "Ngày 2 · Phố cổ" }));
  set(nameInput(), "Chợ");
  act(() => sessionEvents.emitExpired());
  const chosen = draftKey({ viewerId: VIEWER, itineraryId: ITINERARY_ID, kind: "add:2" });
  const fallback = draftKey({ viewerId: VIEWER, itineraryId: ITINERARY_ID, kind: "add:3" });
  expect(window.sessionStorage.getItem(chosen)).not.toBeNull();
  expect(window.sessionStorage.getItem(fallback)).toBeNull();
});

it("has no Day field when opened from a day tab", async () => {
  setup({ mode: { kind: "add", dayNumber: 2 } });
  expect(await screen.findByRole("dialog", { name: "Thêm điểm đến vào Ngày 2" })).toBeTruthy();
  expect(screen.queryByRole("combobox", { name: "Ngày" })).toBeNull();
});

it("has no Day field in the edit form", async () => {
  setup({ mode: { kind: "edit", waypoint: SAVED } });
  expect(await screen.findByRole("dialog", { name: "Sửa điểm đến" })).toBeTruthy();
  expect(screen.queryByRole("combobox", { name: "Ngày" })).toBeNull();
});

it("disables the Day field while sending", async () => {
  h.add.mockImplementation(() => new Promise(() => undefined));
  const { user } = setup({ mode: OVERVIEW_MODE });
  await screen.findByRole("dialog");
  set(nameInput(), "Chợ");
  switchToManual();
  set(locationInput(), COORDS_INPUT);
  await user.click(submitButton());
  await waitFor(() => expect(h.add).toHaveBeenCalledTimes(1));
  expect((dayTrigger() as HTMLButtonElement).hasAttribute("disabled") || dayTrigger().getAttribute("aria-disabled") === "true").toBe(true);
});

// --- Tìm địa điểm (MAP-01, D-146..D-150) ---

const LAM_DONG = "vn-lam-dong";
const pickOption = async (user: ReturnType<typeof userEvent.setup>, name: RegExp) =>
  user.click(await screen.findByRole("option", { name }));
const changePlace = () => fireEvent.click(screen.getByRole("button", { name: "Đổi địa điểm" }));

it("add form opens in search mode with suggestions for the itinerary destination", async () => {
  setup({ destinationCode: LAM_DONG });
  await screen.findByRole("dialog");
  expect(await screen.findByRole("listbox", { name: "Gợi ý ở Lâm Đồng" })).toBeTruthy();
  expect(h.suggest).toHaveBeenCalledWith(LAM_DONG);
  expect(searchInput()).toBeTruthy();
  expect(screen.queryByText("Dán tọa độ (ví dụ 10.7769, 106.7009) hoặc link Google Maps.")).toBeNull();
});

it("picking a place fills location, address and name, keeps notes and sends the 6-decimal coordinate", async () => {
  const { user, onAdded } = setup({ destinationCode: LAM_DONG });
  await screen.findByRole("dialog");
  set(notesInput(), "Đi buổi sáng");
  await pickOption(user, /Crazy House/);

  expect(nameInput().value).toBe("Crazy House");
  expect(addressInput().value).toBe("3 Huỳnh Thúc Kháng, Xuân Hương, Đà Lạt, Lâm Đồng");
  expect(notesInput().value).toBe("Đi buổi sáng");
  expect(screen.getByText("Đã lấy tên từ địa điểm đã chọn, bạn có thể sửa.")).toBeTruthy();
  expect(screen.getByText(/Crazy House · 3 Huỳnh Thúc Kháng, Xuân Hương, Đà Lạt, Lâm Đồng · 11\.9351, 108\.4307/)).toBeTruthy();
  expect(document.activeElement).toBe(screen.getByRole("button", { name: "Đổi địa điểm" }));
  expect(screen.queryByRole("combobox", { name: "Tìm địa điểm" })).toBeNull();

  await user.click(submitButton());
  await waitFor(() => expect(onAdded).toHaveBeenCalledTimes(1));
  expect(h.add.mock.calls[0]?.[0]).toMatchObject({
    name: "Crazy House",
    address: "3 Huỳnh Thúc Kháng, Xuân Hương, Đà Lạt, Lâm Đồng",
    notes: "Đi buổi sáng",
    coordinate: { latitude: 11.935089, longitude: 108.430716 },
  });
  expect(h.reverse).not.toHaveBeenCalled();
});

it("a second pick replaces an auto-filled name but never a name the user typed", async () => {
  const { user } = setup({ destinationCode: LAM_DONG });
  await screen.findByRole("dialog");
  await pickOption(user, /Crazy House/);
  changePlace();
  await waitFor(() => expect(document.activeElement).toBe(searchInput()));
  await pickOption(user, /Hồ Xuân Hương/);
  expect(nameInput().value).toBe("Hồ Xuân Hương");
  expect(addressInput().value).toBe("Xuân Hương, Đà Lạt, Lâm Đồng");

  set(nameInput(), "Hồ của tôi");
  expect(screen.queryByText("Đã lấy tên từ địa điểm đã chọn, bạn có thể sửa.")).toBeNull();
  changePlace();
  await pickOption(user, /Crazy House/);
  expect(nameInput().value).toBe("Hồ của tôi");
  expect(addressInput().value).toBe("3 Huỳnh Thúc Kháng, Xuân Hương, Đà Lạt, Lâm Đồng");
});

it("searches by name after typing and picks with the keyboard without submitting", async () => {
  const { user } = setup({ destinationCode: LAM_DONG });
  await screen.findByRole("dialog");
  await user.type(searchInput(), "ho xuan");
  await screen.findByRole("listbox", { name: "Kết quả tìm kiếm" });
  expect(h.search).toHaveBeenCalledTimes(1);
  expect(h.search).toHaveBeenCalledWith({ text: "ho xuan", destinationCode: LAM_DONG });
  await user.keyboard("{ArrowDown}{Enter}");
  expect(nameInput().value).toBe("Hồ Xuân Hương");
  expect(h.add).not.toHaveBeenCalled();
  expect(screen.queryByText("Vui lòng nhập tên điểm đến.")).toBeNull();
});

it("Esc in the search box clears the text without closing the form, then closes it when empty", async () => {
  const { user, onClose } = setup({ destinationCode: LAM_DONG });
  await screen.findByRole("dialog");
  await user.type(searchInput(), "ho");
  await user.keyboard("{Escape}");
  expect(searchInput().value).toBe("");
  expect(onClose).not.toHaveBeenCalled();
  expect(screen.getByRole("dialog")).toBeTruthy();
  await user.keyboard("{Escape}");
  await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
});

it("'Nhập tọa độ thủ công' shows the old field and 'Tìm địa điểm' goes back", async () => {
  setup({ destinationCode: LAM_DONG });
  await screen.findByRole("dialog");
  switchToManual();
  expect(screen.getByText("Dán tọa độ (ví dụ 10.7769, 106.7009) hoặc link Google Maps.")).toBeTruthy();
  expect(screen.queryByRole("combobox", { name: "Tìm địa điểm" })).toBeNull();
  await waitFor(() => expect(document.activeElement).toBe(locationInput()));
  fireEvent.click(screen.getByRole("button", { name: "Tìm địa điểm" }));
  expect(searchInput()).toBeTruthy();
  await waitFor(() => expect(document.activeElement).toBe(searchInput()));
});

it("a typed coordinate triggers one reverse call and fills the address but not the name for a street", async () => {
  h.reverse.mockResolvedValue(STREET);
  setup({ destinationCode: LAM_DONG });
  await screen.findByRole("dialog");
  switchToManual();
  set(locationInput(), "11.9404, 108.4583");
  expect(await screen.findByText("Đã điền địa chỉ từ OpenStreetMap, bạn có thể sửa.")).toBeTruthy();
  expect(addressInput().value).toBe("Hùng Vương, Xuân Hương, Đà Lạt, Lâm Đồng");
  expect(nameInput().value).toBe("");
  expect(h.reverse).toHaveBeenCalledTimes(1);
  expect(h.reverse).toHaveBeenCalledWith({ latitude: 11.9404, longitude: 108.4583 });
});

it("a reverse hit on a named place fills an empty name", async () => {
  h.reverse.mockResolvedValue(CRAZY_HOUSE);
  setup();
  await screen.findByRole("dialog");
  switchToManual();
  set(locationInput(), "11.935089, 108.430716");
  await waitFor(() => expect(nameInput().value).toBe("Crazy House"));
  expect(addressInput().value).toBe("3 Huỳnh Thúc Kháng, Xuân Hương, Đà Lạt, Lâm Đồng");
});

it("says so when the coordinate has no address, and when the lookup fails", async () => {
  setup();
  await screen.findByRole("dialog");
  switchToManual();
  set(locationInput(), "16.83, 112.34");
  expect(await screen.findByText("Không tìm thấy địa chỉ cho tọa độ này. Bạn có thể tự nhập.")).toBeTruthy();
  h.reverse.mockRejectedValue(makeApiError({ kind: "http", status: 502, code: "Places.Unavailable", message: null }));
  set(locationInput(), "11.1, 108.1");
  expect(await screen.findByText("Chưa lấy được địa chỉ lúc này. Bạn có thể tự nhập.")).toBeTruthy();
  expect(addressInput().value).toBe("");
});

it("edit form opens in manual mode and makes no reverse call for the saved coordinate", async () => {
  setup({ mode: { kind: "edit", waypoint: SAVED }, destinationCode: LAM_DONG });
  await screen.findByRole("dialog");
  expect(locationInput().value).toBe("10.7769, 106.7009");
  expect(screen.queryByRole("combobox", { name: "Tìm địa điểm" })).toBeNull();
  await new Promise((resolve) => setTimeout(resolve, 50));
  expect(h.reverse).not.toHaveBeenCalled();
  expect(addressInput().value).toBe("Quận 1");
});

it("a restored draft with a location opens in manual mode without a reverse call", async () => {
  setup({ restored: { name: "Bản nháp", location: COORDS_INPUT, address: "Đường 1", notes: "" } });
  await screen.findByRole("dialog");
  expect(locationInput().value).toBe(COORDS_INPUT);
  expect(screen.queryByRole("combobox", { name: "Tìm địa điểm" })).toBeNull();
  await new Promise((resolve) => setTimeout(resolve, 50));
  expect(h.reverse).not.toHaveBeenCalled();
  expect(addressInput().value).toBe("Đường 1");
});