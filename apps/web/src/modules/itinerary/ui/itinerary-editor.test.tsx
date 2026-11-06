import { makeApiError } from "@tripory/api-client";
import type { Viewer } from "@tripory/identity";
import { VIETNAM_VIEW_BOUNDS, type Itinerary, type Waypoint } from "@tripory/itinerary";
import { createWgs84Coordinate, parseItineraryId, parseUserId } from "@tripory/shared-kernel";
import { notify } from "@tripory/ui-web";
import { QueryClientProvider } from "@tanstack/react-query";
import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { destinationCatalog } from "@/composition/destination-catalog";
import { makeQueryClient } from "@/composition/query-client";
import { installFakeResizeObserver, type FakeResizeObserverHandle } from "@/test/fake-resize-observer";
import { ItineraryEditor } from "./itinerary-editor";
import { clearEnteredFromList, markEnteredFromList } from "./entry-flag";

const h = vi.hoisted(() => ({
  // Props cuối của bản đồ giả và của EditorLayout, để test đọc pin, camera và yêu cầu mức sheet.
  map: { props: null as Record<string, any> | null }, // eslint-disable-line @typescript-eslint/no-explicit-any
  layout: { props: null as Record<string, any> | null }, // eslint-disable-line @typescript-eslint/no-explicit-any
  getById: vi.fn(),
  addWaypoint: vi.fn(),
  deleteWaypoint: vi.fn(),
  publish: vi.fn(),
  remove: vi.fn(),
  setDaySubtitle: vi.fn(),
  updateMetadata: vi.fn(),
  router: { back: vi.fn(), push: vi.fn(), replace: vi.fn() },
}));

vi.mock("@/composition/itinerary.client", async () => {
  const { createItineraryHooks: factory } = await import("@tripory/itinerary/react");
  const unused = vi.fn();
  return {
    itinerary: factory({
      repository: {
        listMine: unused,
        getById: () => h.getById(),
        create: unused,
        updateMetadata: (id: string, input: unknown) => h.updateMetadata(id, input),
        publish: () => h.publish(),
        remove: (id: string) => h.remove(id),
        addWaypoint: (id: string, input: unknown) => h.addWaypoint(id, input),
        updateWaypoint: unused,
        deleteWaypoint: (id: string, waypointId: string) => h.deleteWaypoint(id, waypointId),
        reorderWaypoints: unused,
        setDaySubtitle: (id: string, day: number, subtitle: string | null) => h.setDaySubtitle(id, day, subtitle),
      },
      shortLinks: { resolve: unused },
    }),
    itineraryUnload: { deleteWaypoint: unused },
  };
});
// Bản đồ thật cần WebGL: thay bằng bản giả lưu props; test gọi `onStatusChange`, `onPinSelect`, `onBackgroundClick` bằng tay.
vi.mock("./map/trip-map.lazy", () => ({
  LazyTripMap: function FakeTripMap(props: Record<string, unknown>) {
    h.map.props = props;
    // Bản đồ thật chỉ vẽ `topControls` khi đã `ready`; bản giả vẽ luôn để test kiểm hành vi của chính nút.
    return <div data-testid="fake-trip-map">{props.topControls as ReactNode}</div>;
  },
}));
vi.mock("./editor-layout", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./editor-layout")>();
  return {
    ...actual,
    EditorLayout: function RecordingLayout(props: React.ComponentProps<typeof actual.EditorLayout>) {
      h.layout.props = props;
      return <actual.EditorLayout {...props} />;
    },
  };
});
vi.mock("@/composition/session-events.client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/composition/session-events.client")>();
  return { sessionEvents: actual.makeSessionEvents({ createChannel: () => null }) };
});
vi.mock("next/navigation", () => ({
  useRouter: () => h.router,
  usePathname: () => "/itineraries/x/edit",
}));
vi.mock("@/components/user-menu", () => ({
  UserMenu: () => <div data-testid="user-menu" />,
}));

const ID = parseItineraryId("3f2a6c1e-8b7d-4e21-9c55-0a1b2c3d4e5f");
const OWNER = parseUserId("3f2504e0-4f89-11d3-9a0c-0305e82c3301");
const OTHER = parseUserId("9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d");
const COORD = createWgs84Coordinate({ latitude: 10.7769, longitude: 106.7009 });
if (ID === null || OWNER === null || OTHER === null || COORD === null) throw new Error("dữ liệu mẫu phải hợp lệ");

const viewer: Viewer = { id: OWNER, email: "anh@tripory.vn", fullName: "Nguyễn Văn Ánh", handle: "anh", avatarUrl: null };

const waypoint = (id: string, name: string, dayNumber: number, orderIndex: number): Waypoint => ({
  id,
  dayNumber,
  orderIndex,
  name,
  address: null,
  notes: null,
  coordinate: COORD,
});

const A = waypoint("w-a", "Chợ Bến Thành", 1, 0);
const B = waypoint("w-b", "Dinh Độc Lập", 1, 1);
const C = waypoint("w-c", "Nhà thờ Đức Bà", 2, 0);

const makeItinerary = (overrides: Partial<Itinerary> = {}): Itinerary => ({
  id: ID,
  ownerId: OWNER,
  title: "Sài Gòn 3 ngày",
  description: null,
  coverImageUrl: null,
  coverImages: [],
  destinationCode: null,
  interests: [],
  startDate: null,
  isPublic: false,
  totalDistanceKm: 0,
  days: [
    { dayNumber: 1, subtitle: null, distanceKm: null },
    { dayNumber: 2, subtitle: null, distanceKm: null },
  ],
  waypoints: [A, B, C],
  ...overrides,
});

// "BE" giữ trạng thái: lệnh ghi thành công đổi `server`, lần tải lại sau đó (settle) trả bản mới.
let server: Itinerary;

const originalMatchMedia = window.matchMedia;
const originalScrollIntoView = Element.prototype.scrollIntoView;
let ro: FakeResizeObserverHandle;
let undoToasts: Array<{ onAction(): void }> = [];

beforeEach(() => {
  server = makeItinerary();
  undoToasts = [];
  clearEnteredFromList();
  sessionStorage.clear();
  h.router.back.mockReset();
  h.router.push.mockReset();
  h.router.replace.mockReset();
  h.getById.mockReset().mockImplementation(() => Promise.resolve(server));
  h.setDaySubtitle.mockReset().mockResolvedValue(undefined);
  h.publish.mockReset().mockImplementation(() => {
    server = { ...server, isPublic: true };
    return Promise.resolve();
  });
  h.remove.mockReset().mockResolvedValue(undefined);
  h.deleteWaypoint.mockReset().mockImplementation((_id: string, waypointId: string) => {
    server = { ...server, waypoints: server.waypoints.filter((w) => w.id !== waypointId) };
    return Promise.resolve();
  });
  h.addWaypoint.mockReset().mockImplementation((_id: string, input: { dayNumber: number; name: string }) => {
    const created = waypoint("w-new", input.name, input.dayNumber, 9);
    server = { ...server, waypoints: [...server.waypoints, created] };
    return Promise.resolve(created);
  });
  // Desktop: mọi breakpoint min-width đều khớp, không giảm chuyển động.
  window.matchMedia = ((query: string) =>
    ({
      matches: query.includes("min-width"),
      media: query,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    }) as unknown as MediaQueryList) as typeof window.matchMedia;
  Element.prototype.scrollIntoView = vi.fn();
  ro = installFakeResizeObserver();
  vi.spyOn(notify, "undoable").mockImplementation((_title, o) => {
    undoToasts.push(o);
    return undoToasts.length;
  });
  vi.spyOn(notify, "dismiss").mockImplementation(() => "");
  vi.spyOn(notify, "success").mockImplementation(() => "");
});

afterEach(() => {
  window.matchMedia = originalMatchMedia;
  Element.prototype.scrollIntoView = originalScrollIntoView;
  ro.restore();
  vi.restoreAllMocks();
});

function setup(options: { viewerOverride?: Viewer } = {}) {
  const user = userEvent.setup();
  render(
    <QueryClientProvider client={makeQueryClient()}>
      <ItineraryEditor itineraryId={ID!} viewer={options.viewerOverride ?? viewer} />
    </QueryClientProvider>,
  );
  return { user };
}

const apiError = (status: number, code: string | null = null) =>
  makeApiError({ kind: "http", status, code, message: null });

const loaded = () => screen.findByRole("heading", { level: 1, name: "Sài Gòn 3 ngày" });
const mainButton = (id: string) => document.querySelector<HTMLElement>(`[data-waypoint-main="${id}"]`);

it("shows the minimal header skeleton and the generic title while loading", async () => {
  h.getById.mockImplementation(() => new Promise(() => undefined));
  setup();
  expect(screen.getByRole("status").textContent).toBe("Đang tải lịch trình…");
  await waitFor(() => expect(document.title).toBe("Sửa lịch trình · Tripory"));
  expect(screen.queryByRole("button", { name: "Xuất bản" })).toBeNull();
});

it("shows ErrorState for a 5xx and retries the request from 'Thử lại'", async () => {
  h.getById.mockRejectedValueOnce(apiError(500));
  const { user } = setup();
  await user.click(await screen.findByRole("button", { name: "Thử lại" }));
  await loaded();
  expect(h.getById).toHaveBeenCalledTimes(2);
});

it("shows the shared not-found view when the BE answers 404", async () => {
  h.getById.mockRejectedValue(apiError(404, "Itinerary.NotFound"));
  setup();
  expect(await screen.findByText("Trang bạn đang tìm không tồn tại hoặc đã được di chuyển.")).toBeTruthy();
  expect(screen.queryByRole("button", { name: "Thử lại" })).toBeNull();
});

it("shows the forbidden body when the BE answers 403", async () => {
  h.getById.mockRejectedValue(apiError(403, "Itinerary.Forbidden"));
  setup();
  expect(await screen.findByText("Bạn không có quyền sửa lịch trình này")).toBeTruthy();
  await waitFor(() => expect(document.title).toBe("Không có quyền truy cập · Tripory"));
});

it("shows the forbidden body without edit actions when the owner is somebody else", async () => {
  server = makeItinerary({ ownerId: OTHER, isPublic: true, title: "Chuyến của người khác" });
  setup();
  expect(await screen.findByText("Bạn không có quyền sửa lịch trình này")).toBeTruthy();
  expect(screen.queryByText("Chuyến của người khác")).toBeNull();
  expect(screen.queryByRole("button", { name: "Xuất bản" })).toBeNull();
  expect(screen.queryByRole("button", { name: "Thông tin chuyến đi" })).toBeNull();
  expect(screen.queryByRole("button", { name: "Xóa lịch trình" })).toBeNull();
});

const openDayTab = (user: ReturnType<typeof userEvent.setup>, day: number) =>
  user.click(screen.getByRole("tab", { name: new RegExp(`^Ngày ${day}`) }));

it("opens the owner's editor on the Overview tab (it has waypoints) with the itinerary title in the document title", async () => {
  setup();
  await loaded();
  expect(screen.getByRole("tab", { name: /^Tổng quan/ }).getAttribute("aria-selected")).toBe("true");
  expect(screen.getByRole("heading", { level: 3, name: "Các ngày" })).toBeTruthy();
  expect(screen.queryByRole("list", { name: "Điểm đến Ngày 1" })).toBeNull();
  await waitFor(() => expect(document.title).toBe("Sài Gòn 3 ngày · Tripory"));
});

it("opens on Ngày 1 when the itinerary has no waypoint yet", async () => {
  server = makeItinerary({ waypoints: [] });
  setup();
  await loaded();
  expect(screen.getByRole("tab", { name: /^Ngày 1/ }).getAttribute("aria-selected")).toBe("true");
  expect(screen.getByText("Chưa có điểm đến nào trong Ngày 1")).toBeTruthy();
});

it("adds a waypoint at the end of the day, highlights it for 1500 ms and announces it", async () => {
  const { user } = setup();
  await loaded();
  await openDayTab(user, 1);
  await user.click(screen.getByRole("button", { name: "Thêm điểm đến" }));
  const dialog = await screen.findByRole("dialog", { name: "Thêm điểm đến vào Ngày 1" });
  await user.type(within(dialog).getByLabelText(/^Tên/), "Chợ");
  await user.type(within(dialog).getByLabelText(/^Vị trí/), "10.7725, 106.7009");
  await user.click(within(dialog).getByRole("button", { name: "Thêm điểm đến" }));

  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  expect(screen.getByText("Đã thêm Chợ vào Ngày 1")).toBeTruthy();
  const card = (await waitFor(() => {
    const element = mainButton("w-new");
    expect(element).not.toBeNull();
    return element;
  }))!.closest("li")!;
  const items = within(screen.getByRole("list", { name: "Điểm đến Ngày 1" })).getAllByRole("listitem");
  expect(items.at(-1)).toBe(card);
  expect(card.className).toContain("bg-primary-subtle");
  await waitFor(() => expect(card.className).not.toContain("bg-primary-subtle"), { timeout: 2500 });
});

it("opens 'Thông tin chuyến đi' from the header 'i' button and from the summary area", async () => {
  const { user } = setup();
  await loaded();
  await user.click(screen.getByRole("button", { name: "Thông tin chuyến đi" }));
  const first = await screen.findByRole("dialog");
  expect(within(first).getByLabelText(/^Tiêu đề/)).toBeTruthy();
  await user.click(within(first).getByRole("button", { name: "Đóng" }));
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());

  const summary = screen.getByRole("region", { name: "Thông tin chuyến đi" });
  await user.click(within(summary).getByText("Sài Gòn 3 ngày"));
  expect(await screen.findByRole("dialog")).toBeTruthy();
});

it("deletes a waypoint with an undo toast, moves focus to the next card and restores focus on undo", async () => {
  const { user } = setup();
  await loaded();
  await openDayTab(user, 1);
  await user.click(screen.getByRole("button", { name: 'Thao tác cho "Chợ Bến Thành"' }));
  await user.click(await screen.findByRole("menuitem", { name: "Xóa" }));

  await waitFor(() => expect(mainButton("w-a")).toBeNull());
  expect(notify.undoable).toHaveBeenCalledWith('Đã xóa "Chợ Bến Thành"', expect.objectContaining({ actionLabel: "Hoàn tác" }));
  await waitFor(() => expect(document.activeElement).toBe(mainButton("w-b")));

  undoToasts[0]!.onAction();
  await waitFor(() => expect(mainButton("w-a")).not.toBeNull());
  await waitFor(() => expect(document.activeElement).toBe(mainButton("w-a")));
  expect(h.deleteWaypoint).not.toHaveBeenCalled();
});

it("deletes the itinerary from the header delete button and replaces the route with the list", async () => {
  const { user } = setup();
  await loaded();
  await user.click(screen.getByRole("button", { name: "Xóa lịch trình" }));
  const dialog = await screen.findByRole("dialog");
  await user.click(within(dialog).getByRole("button", { name: "Xóa" }));

  await waitFor(() => expect(h.router.replace).toHaveBeenCalledWith("/itineraries/mine"));
  expect(h.remove).toHaveBeenCalledWith(ID);
  expect(notify.success).toHaveBeenCalledWith("Đã xóa lịch trình");
});

it("publishes after confirmation, then hides the button, shows the live note and focuses the 'i' button", async () => {
  const { user } = setup();
  await loaded();
  await user.click(screen.getByRole("button", { name: "Xuất bản" }));
  const dialog = await screen.findByRole("dialog", { name: "Xuất bản lịch trình?" });
  await user.click(within(dialog).getByRole("button", { name: "Xuất bản" }));

  await waitFor(() => expect(screen.queryByRole("button", { name: "Xuất bản" })).toBeNull());
  expect(screen.queryByText("Thay đổi hiển thị ngay với người xem")).toBeNull();
  await waitFor(() => expect(document.activeElement).toBe(screen.getByRole("button", { name: "Thông tin chuyến đi" })));
});

it("goes back one step when the editor was entered from the list", async () => {
  markEnteredFromList();
  const { user } = setup();
  await loaded();
  await user.click(screen.getByRole("button", { name: "Về Lịch trình của tôi" }));
  expect(h.router.back).toHaveBeenCalledTimes(1);
  expect(h.router.push).not.toHaveBeenCalled();
});

it("pushes the list route when the editor was opened directly", async () => {
  const { user } = setup();
  await loaded();
  await user.click(screen.getByRole("button", { name: "Về Lịch trình của tôi" }));
  expect(h.router.push).toHaveBeenCalledWith("/itineraries/mine");
  expect(h.router.back).not.toHaveBeenCalled();
});

it("asks before leaving while a write is still pending", async () => {
  h.setDaySubtitle.mockImplementation(() => new Promise(() => undefined));
  const { user } = setup();
  await loaded();
  await openDayTab(user, 1);
  await user.click(screen.getByRole("button", { name: "Thêm phụ đề cho Ngày 1" }));
  await user.type(screen.getByLabelText("Phụ đề Ngày 1"), "Trung tâm{Enter}");
  await user.click(screen.getByRole("button", { name: "Về Lịch trình của tôi" }));

  const dialog = await screen.findByRole("dialog", { name: "Thay đổi đang được lưu. Rời trang?" });
  expect(h.router.push).not.toHaveBeenCalled();
  await user.click(within(dialog).getByRole("button", { name: "Rời trang" }));
  expect(h.router.push).toHaveBeenCalledWith("/itineraries/mine");
});

it("reopens the add form with the stored draft and the restore notice", async () => {
  sessionStorage.setItem(
    `tripory:draft:v1:${OWNER}:${ID}:add:1`,
    JSON.stringify({ savedAt: Date.now(), values: { name: "Quán cà phê", location: "10.77, 106.70", address: "", notes: "" } }),
  );
  setup();
  const dialog = await screen.findByRole("dialog", { name: "Thêm điểm đến vào Ngày 1" });
  expect(within(dialog).getByText("Đã khôi phục nội dung chưa lưu")).toBeTruthy();
  expect((within(dialog).getByLabelText(/^Tên/) as HTMLInputElement).value).toBe("Quán cà phê");
});

it("drops the draft of a waypoint that no longer exists and opens nothing", async () => {
  const key = `tripory:draft:v1:${OWNER}:${ID}:edit:w-gone`;
  sessionStorage.setItem(
    key,
    JSON.stringify({ savedAt: Date.now(), values: { name: "Đã mất", location: "10.77, 106.70", address: "", notes: "" } }),
  );
  setup();
  await loaded();
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(sessionStorage.getItem(key)).toBeNull();
});

it("ignores another viewer's draft", async () => {
  sessionStorage.setItem(
    `tripory:draft:v1:${OTHER}:${ID}:add:1`,
    JSON.stringify({ savedAt: Date.now(), values: { name: "Của người khác", location: "10.77, 106.70", address: "", notes: "" } }),
  );
  setup();
  await loaded();
  expect(screen.queryByRole("dialog")).toBeNull();
});

const allDialogs = () => Array.from(document.querySelectorAll<HTMLElement>('[role="dialog"]'));

async function openTripInfoFromHeader(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: "Thông tin chuyến đi" }));
  return screen.findByRole("dialog", { name: "Thông tin chuyến đi" });
}

it("returns focus to the 'i' button when the trip info dialog closes", async () => {
  const { user } = setup();
  await loaded();
  const tripInfo = await openTripInfoFromHeader(user);

  await user.click(within(tripInfo).getByRole("button", { name: "Đóng" }));

  await waitFor(() => expect(allDialogs()).toHaveLength(0));
  await waitFor(() => expect(document.activeElement).toBe(screen.getByRole("button", { name: "Thông tin chuyến đi" })));
});

it("returns focus to the delete button when the delete confirmation is cancelled", async () => {
  const { user } = setup();
  await loaded();
  await user.click(screen.getByRole("button", { name: "Xóa lịch trình" }));
  const confirm = await screen.findByRole("dialog");

  await user.click(within(confirm).getByRole("button", { name: "Hủy" }));

  await waitFor(() => expect(allDialogs()).toHaveLength(0));
  await waitFor(() => expect(document.activeElement).toBe(screen.getByRole("button", { name: "Xóa lịch trình" })));
});

it("has no ⋯ menu and no user menu in the loaded editor header", async () => {
  setup();
  await loaded();
  expect(screen.queryByRole("button", { name: "Thao tác lịch trình" })).toBeNull();
  expect(screen.queryByTestId("user-menu")).toBeNull();
});

it("auto-saves a title change after 800 ms and the summary title updates at once (optimistic, LW-02)", async () => {
  h.updateMetadata.mockImplementation(() => new Promise(() => undefined));
  const { user } = setup();
  await loaded();
  const tripInfo = await openTripInfoFromHeader(user);
  const title = within(tripInfo).getByRole("textbox", { name: /^Tiêu đề/ });
  await user.clear(title);
  await user.type(title, "Tên mới");
  await waitFor(() => expect(h.updateMetadata).toHaveBeenCalledTimes(1), { timeout: 3000 });
  expect(h.updateMetadata.mock.calls[0]?.[1]).toMatchObject({ title: "Tên mới" });
  expect(screen.getAllByText("Tên mới").length).toBeGreaterThan(0);
});

it("ignores and cleans a legacy 'metadata' draft instead of reopening the dialog (D-107)", async () => {
  const key = `tripory:draft:v1:${OWNER}:${ID}:metadata`;
  sessionStorage.setItem(key, JSON.stringify({ savedAt: Date.now(), values: { title: "Bản nháp cũ" } }));
  setup();
  await loaded();
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(sessionStorage.getItem(key)).toBeNull();
});

it("warns before leaving the tab while an auto-save is still pending", async () => {
  const { user } = setup();
  await loaded();
  const tripInfo = await openTripInfoFromHeader(user);
  await user.type(within(tripInfo).getByRole("textbox", { name: /^Tiêu đề/ }), "x");
  const event = new Event("beforeunload", { cancelable: true });
  window.dispatchEvent(event);
  expect(event.defaultPrevented).toBe(true);
});

// ---- Bản đồ và tab Tổng quan (PUB-06) ----
type FakePin = { waypointId: string; state: string; labelDetail?: string };
type FakeCamera = { seq: number; kind: string; target?: { kind: string; bounds?: unknown; center?: number[] }; center?: number[] };
const mapProps = () => h.map.props ?? {};
const pins = () => (mapProps().pins ?? []) as FakePin[];
const pinOf = (id: string) => pins().find((pin) => pin.waypointId === id);
const cameraCommand = () => mapProps().camera as FakeCamera;
const reportMap = (status: "loading" | "ready" | "error") => act(() => mapProps().onStatusChange(status));
const selectPin = (id: string) => act(() => mapProps().onPinSelect(id));
const setMobile = () => {
  window.matchMedia = ((query: string) =>
    ({ matches: false, media: query, addEventListener: () => undefined, removeEventListener: () => undefined }) as unknown as MediaQueryList) as typeof window.matchMedia;
};
const dayRow = (day: number) => screen.getByRole("button", { name: new RegExp(`^Xem Ngày ${day}`) });

it("Overview tab has the gear 'Sửa thông tin' on the map (not as a text button in the summary) and it opens the trip info dialog", async () => {
  const { user } = setup();
  await loaded();
  reportMap("ready");

  const map = screen.getByTestId("fake-trip-map");
  const gear = within(map).getByRole("button", { name: "Sửa thông tin" });
  expect(gear.getAttribute("title")).toBe("Sửa thông tin");
  expect(within(screen.getByRole("region", { name: "Thông tin chuyến đi" })).queryByRole("button", { name: "Sửa thông tin" })).toBeNull();

  await user.click(gear);
  expect(await screen.findByRole("dialog", { name: "Thông tin chuyến đi" })).toBeTruthy();
});

it("the gear 'Sửa thông tin' is keyboard operable and is not shown on a day tab", async () => {
  const { user } = setup();
  await loaded();
  reportMap("ready");

  const gear = within(screen.getByTestId("fake-trip-map")).getByRole("button", { name: "Sửa thông tin" });
  gear.focus();
  await user.keyboard("{Enter}");
  expect(await screen.findByRole("dialog", { name: "Thông tin chuyến đi" })).toBeTruthy();
  await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Đóng" }));
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());

  await openDayTab(user, 1);
  expect(screen.queryByRole("button", { name: "Sửa thông tin" })).toBeNull();
});

it("starts with a fit command over all waypoints when it opens on the Overview tab", async () => {
  setup();
  await loaded();
  expect(cameraCommand()).toMatchObject({ seq: 1, kind: "fit" });
  expect(pins()).toHaveLength(3);
});

it("fits the bounding box of the destination province when there is no waypoint yet, and shows the hint chip once ready", async () => {
  server = makeItinerary({ waypoints: [], destinationCode: "vn-da-nang" });
  setup();
  await loaded();
  expect(cameraCommand()).toMatchObject({ kind: "fit", target: { kind: "bounds", bounds: destinationCatalog.findBySlug("vn-da-nang")?.view.bounds } });
  expect(screen.queryByText("Thêm điểm đến để thấy trên bản đồ")).toBeNull();
  reportMap("ready");
  expect(screen.getByText("Thêm điểm đến để thấy trên bản đồ")).toBeTruthy();
});

it("fits Vietnam when there is no waypoint and no destination", async () => {
  server = makeItinerary({ waypoints: [], destinationCode: null });
  setup();
  await loaded();
  expect(cameraCommand()).toMatchObject({ kind: "fit", target: { kind: "bounds", bounds: VIETNAM_VIEW_BOUNDS } });
});

it("opens the day tab of a stored add draft", async () => {
  sessionStorage.setItem(
    `tripory:draft:v1:${OWNER}:${ID}:add:2`,
    JSON.stringify({ savedAt: Date.now(), values: { name: "Quán", location: "10.77, 106.70", address: "", notes: "" } }),
  );
  setup();
  expect(await screen.findByRole("dialog", { name: "Thêm điểm đến vào Ngày 2" })).toBeTruthy();
  // Hộp thoại modal đặt phần còn lại là aria-hidden nên phải tìm tab với `hidden`.
  expect(screen.getByRole("tab", { name: /^Ngày 2/, hidden: true }).getAttribute("aria-selected")).toBe("true");
});

it("changing tab clears the selection, dims the other days and fits the new tab", async () => {
  const { user } = setup();
  await loaded();
  const before = cameraCommand().seq;

  await openDayTab(user, 1);

  expect(pinOf("w-a")?.state).toBe("normal");
  expect(pinOf("w-c")?.state).toBe("dimmed");
  expect(cameraCommand()).toMatchObject({ kind: "fit" });
  expect(cameraCommand().seq).toBeGreaterThan(before);
});

it("on a day tab a pin selects its card, keeps the form closed, reveals the pin and asks the sheet for the medium snap", async () => {
  const { user } = setup();
  await loaded();
  await openDayTab(user, 1);
  reportMap("ready");

  selectPin("w-a");

  expect(pinOf("w-a")?.state).toBe("selected");
  expect(mainButton("w-a")?.getAttribute("aria-current")).toBe("true");
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(cameraCommand()).toMatchObject({ kind: "reveal" });
  expect(h.layout.props?.sheetSnapRequest).toEqual({ seq: 1, snap: "medium" });
  selectPin("w-b");
  expect(h.layout.props?.sheetSnapRequest).toEqual({ seq: 2, snap: "medium" });
});

it("on the Overview tab a pin highlights its day row with a two-line label and does not change the tab", async () => {
  setup();
  await loaded();
  reportMap("ready");

  selectPin("w-c");

  expect(screen.getByRole("tab", { name: /^Tổng quan/ }).getAttribute("aria-selected")).toBe("true");
  expect(dayRow(2).className.split(/\s+/)).toContain("ring-text");
  expect(dayRow(1).className.split(/\s+/)).not.toContain("ring-text");
  expect(pins().find((pin) => pin.waypointId === "w-c")?.labelDetail).toBe("Ngày 2");
});

it("before the map is ready the main button opens the edit form; after it is ready it selects and moves the map keeping the zoom", async () => {
  const { user } = setup();
  await loaded();
  await openDayTab(user, 1);

  await user.click(mainButton("w-a")!);
  const dialog = await screen.findByRole("dialog", { name: "Sửa điểm đến" });
  await user.click(within(dialog).getByRole("button", { name: "Hủy" }));
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());

  reportMap("ready");
  await user.click(mainButton("w-a")!);

  expect(screen.queryByRole("dialog")).toBeNull();
  expect(cameraCommand()).toMatchObject({ kind: "focus", center: [106.7009, 10.7769] });
  expect(mainButton("w-a")?.getAttribute("aria-current")).toBe("true");
});

it("clicking a day row on the Overview tab opens that day and focuses its tab", async () => {
  const { user } = setup();
  await loaded();

  await user.click(dayRow(2));

  const tab = screen.getByRole("tab", { name: /^Ngày 2/ });
  expect(tab.getAttribute("aria-selected")).toBe("true");
  await waitFor(() => expect(document.activeElement).toBe(tab));
  expect(cameraCommand()).toMatchObject({ kind: "fit" });
});

it("from lg, hovering a day row emphasises that day on the map and leaving restores it", async () => {
  const { user } = setup();
  await loaded();

  await user.hover(dayRow(2));
  expect(pinOf("w-a")?.state).toBe("dimmed");
  expect(pinOf("w-c")?.state).toBe("normal");

  await user.unhover(dayRow(2));
  expect(pins().map((pin) => pin.state)).toEqual(["normal", "normal", "normal"]);
});

it("below lg, hovering a day row does not change the pins", async () => {
  setMobile();
  const { user } = setup();
  await loaded();

  await user.hover(dayRow(2));

  expect(pins().map((pin) => pin.state)).toEqual(["normal", "normal", "normal"]);
});

it("adds a waypoint from the Overview tab: day field defaults to the last day, the tab stays, the map moves without selecting, the day row flashes", async () => {
  const { user } = setup();
  await loaded();

  await user.click(screen.getByRole("button", { name: "Thêm điểm đến" }));
  const dialog = await screen.findByRole("dialog", { name: "Thêm điểm đến" });
  expect(within(dialog).getByRole("combobox", { name: "Ngày" }).textContent).toContain("Ngày 2");
  await user.type(within(dialog).getByLabelText(/^Tên/), "Chợ");
  await user.type(within(dialog).getByLabelText(/^Vị trí/), "10.7725, 106.7009");
  await user.click(within(dialog).getByRole("button", { name: "Thêm điểm đến" }));
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());

  expect(screen.getByRole("tab", { name: /^Tổng quan/ }).getAttribute("aria-selected")).toBe("true");
  expect(screen.getByText("Đã thêm Chợ vào Ngày 2")).toBeTruthy();
  // Bản thêm giả của BE luôn trả tọa độ COORD, nên bản đồ di chuyển tới đó.
  expect(cameraCommand()).toMatchObject({ kind: "focus", center: [106.7009, 10.7769] });
  expect(pins().some((pin) => pin.state === "selected")).toBe(false);
  expect(dayRow(2).className).toContain("bg-primary-subtle");
  await waitFor(() => expect(document.activeElement).toBe(screen.getByRole("button", { name: "Thêm điểm đến" })));
  await waitFor(() => expect(dayRow(2).className).not.toContain("bg-primary-subtle"), { timeout: 2500 });
});

it("deleting the selected waypoint clears the selection and does not move the map", async () => {
  const { user } = setup();
  await loaded();
  await openDayTab(user, 1);
  reportMap("ready");
  await user.click(mainButton("w-a")!);
  const seq = cameraCommand().seq;

  await user.click(screen.getByRole("button", { name: 'Thao tác cho "Chợ Bến Thành"' }));
  await user.click(await screen.findByRole("menuitem", { name: "Xóa" }));

  await waitFor(() => expect(mainButton("w-a")).toBeNull());
  expect(pinOf("w-a")).toBeUndefined();
  expect(pins().some((pin) => pin.state === "selected")).toBe(false);
  expect(cameraCommand().seq).toBe(seq);
});

it("clicking the map background clears the selection", async () => {
  const { user } = setup();
  await loaded();
  await openDayTab(user, 1);
  reportMap("ready");
  selectPin("w-a");
  expect(pinOf("w-a")?.state).toBe("selected");

  act(() => mapProps().onBackgroundClick());

  expect(pinOf("w-a")?.state).toBe("normal");
  expect(mainButton("w-a")?.getAttribute("aria-current")).toBeNull();
});

it("when the map fails it shows the notice and the summary, and the main button edits again", async () => {
  const { user } = setup();
  await loaded();
  await openDayTab(user, 1);
  reportMap("ready");

  reportMap("error");

  expect(screen.getByText("Không tải được bản đồ")).toBeTruthy();
  expect(screen.getByRole("region", { name: "Thông tin chuyến đi" })).toBeTruthy();
  await user.click(mainButton("w-a")!);
  expect(await screen.findByRole("dialog", { name: "Sửa điểm đến" })).toBeTruthy();
});

it("when the map fails on the Overview tab the gear is gone but the fallback summary keeps a 'Sửa thông tin' way to edit", async () => {
  const { user } = setup();
  await loaded();
  reportMap("ready");
  expect(screen.getAllByRole("button", { name: "Sửa thông tin" })).toHaveLength(1);

  reportMap("error");

  expect(screen.queryByTestId("fake-trip-map")).toBeNull();
  const fallbackEdit = screen.getAllByRole("button", { name: "Sửa thông tin" });
  expect(fallbackEdit).toHaveLength(1);
  await user.click(fallbackEdit[0]!);
  expect(await screen.findByRole("dialog", { name: "Thông tin chuyến đi" })).toBeTruthy();
});