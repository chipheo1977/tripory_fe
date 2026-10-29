import { makeApiError } from "@tripory/api-client";
import { applyDayOrder, buildDayRange, type Itinerary, type Waypoint } from "@tripory/itinerary";
import { itineraryKeys } from "@tripory/itinerary/react";
import { createWgs84Coordinate, parseItineraryId, parseUserId } from "@tripory/shared-kernel";
import { notify } from "@tripory/ui-web";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef, StrictMode, type RefObject } from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { makeQueryClient } from "@/composition/query-client";
import { createSaveStatusStore, SaveStatusProvider } from "./save-status";
import { WaypointList, type WaypointFocusRequest } from "./waypoint-list";

const h = vi.hoisted(() => ({ reorderWaypoints: vi.fn(), getById: vi.fn() }));

vi.mock("@/composition/itinerary.client", async () => {
  const { createItineraryHooks: factory } = await import("@tripory/itinerary/react");
  const unused = vi.fn();
  return {
    itinerary: factory({
      repository: {
        listMine: unused,
        getById: () => h.getById(),
        create: unused,
        updateMetadata: unused,
        publish: unused,
        remove: unused,
        addWaypoint: unused,
        updateWaypoint: unused,
        deleteWaypoint: unused,
        reorderWaypoints: (id: string, input: unknown) => h.reorderWaypoints(id, input),
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
const COORD = createWgs84Coordinate({ latitude: 10.7769, longitude: 106.7009 });
if (ID === null || OWNER === null || COORD === null) throw new Error("dữ liệu mẫu phải hợp lệ");

const waypoint = (id: string, name: string, orderIndex: number, address: string | null = null): Waypoint => ({
  id,
  dayNumber: 1,
  orderIndex,
  name,
  address,
  notes: null,
  coordinate: COORD,
});

const W0 = waypoint("w0", "Chợ Bến Thành", 0, "Lê Lợi, Quận 1");
const W1 = waypoint("w1", "Dinh Độc Lập", 1);
const W2 = waypoint("w2", "Bưu điện", 2);

const makeItinerary = (waypoints: readonly Waypoint[]): Itinerary => ({
  id: ID,
  ownerId: OWNER,
  title: "Sài Gòn",
  description: null,
  coverImageUrl: null,
  startDate: null,
  isPublic: false,
  totalDistanceKm: 0,
  days: [{ dayNumber: 1, subtitle: null, distanceKm: null }],
  waypoints,
});

// jsdom không có layout: mock rect của `li` theo vị trí trong DOM (xem spike 04-05).
const ITEM_HEIGHT = 40;
const ITEM_STRIDE = 50;
const originalRect = Element.prototype.getBoundingClientRect;

// "BE" giữ trạng thái: reorder thành công thì lần tải lại sau đó (settle) trả thứ tự mới, như BE thật.
let server = makeItinerary([]);

type SetupOptions = {
  waypoints?: readonly Waypoint[];
  pendingIds?: ReadonlySet<string>;
  highlightId?: string | null;
  focusRequest?: WaypointFocusRequest | null;
  strict?: boolean;
  emptyAction?: () => void;
  externalAddButton?: boolean;
};

function setup(options: SetupOptions = {}) {
  const user = userEvent.setup();
  const store = createSaveStatusStore();
  const queryClient = makeQueryClient();
  const base = makeItinerary(options.waypoints ?? [W0, W1, W2]);
  queryClient.setQueryData(itineraryKeys.detail(ID!), base);
  // "BE" giữ trạng thái: reorder thành công thì lần tải lại sau đó (settle) trả thứ tự mới, như BE thật.
  server = base;
  const onRemove = vi.fn();
  const onEdit = vi.fn();
  const onFlushPending = vi.fn();
  const addButtonRef: RefObject<HTMLButtonElement | null> = createRef();

  function Harness() {
    const { data } = useQuery({
      queryKey: itineraryKeys.detail(ID!),
      queryFn: () => h.getById() as Promise<Itinerary>,
      staleTime: Infinity,
    });
    if (data === undefined) return null;
    const day = buildDayRange(data)[0]!;
    return (
      <>
        <WaypointList
          addButtonRef={addButtonRef}
          day={day}
          emptyAction={options.emptyAction}
          focusRequest={options.focusRequest ?? null}
          highlightId={options.highlightId ?? null}
          itinerary={data}
          onEdit={onEdit}
          onFlushPending={onFlushPending}
          onRemove={onRemove}
          pendingIds={options.pendingIds ?? new Set()}
        />
        {options.externalAddButton ? (
          <button ref={addButtonRef} type="button">
            Thêm điểm đến
          </button>
        ) : null}
      </>
    );
  }

  const tree = (
    <QueryClientProvider client={queryClient}>
      <SaveStatusProvider store={store}>
        <Harness />
      </SaveStatusProvider>
    </QueryClientProvider>
  );
  render(options.strict ? <StrictMode>{tree}</StrictMode> : tree);
  return { user, store, queryClient, onRemove, onEdit, onFlushPending, addButtonRef };
}

/** Tên accessible của nút chính từng thẻ, theo thứ tự đang hiển thị. */
const mainButtons = () =>
  within(screen.getByRole("list", { name: "Điểm đến Ngày 1" }))
    .getAllByRole("listitem")
    .map((li) => li.querySelector<HTMLButtonElement>("[data-waypoint-main]")?.getAttribute("aria-label"));

const handleOf = (name: string) => screen.getByRole("button", { name: `Kéo để sắp xếp ${name}` });

async function liftFirstDown(user: ReturnType<typeof userEvent.setup>, name = W0.name) {
  handleOf(name).focus();
  await user.keyboard(" ");
  await user.keyboard("{ArrowDown}");
  await user.keyboard(" ");
}

beforeEach(() => {
  h.getById.mockReset().mockImplementation(() => Promise.resolve(server));
  h.reorderWaypoints
    .mockReset()
    .mockImplementation((_id: string, input: { dayNumber: number; orderedIds: readonly string[] }) => {
      server = applyDayOrder(server, input.dayNumber, input.orderedIds);
      return Promise.resolve();
    });
  vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(function (this: Element) {
    if (this.tagName !== "LI") return originalRect.call(this);
    const index = this.parentElement ? Array.from(this.parentElement.children).indexOf(this) : 0;
    const top = index * ITEM_STRIDE;
    return {
      x: 0,
      y: top,
      top,
      bottom: top + ITEM_HEIGHT,
      left: 0,
      right: 200,
      width: 200,
      height: ITEM_HEIGHT,
      toJSON: () => ({}),
    } as DOMRect;
  });
  vi.spyOn(notify, "info").mockImplementation(() => "");
  vi.spyOn(notify, "error").mockImplementation(() => "");
});

afterEach(() => {
  vi.restoreAllMocks();
});

it("hides waypoints pending deletion and numbers the visible ones", () => {
  setup({ pendingIds: new Set(["w1"]) });

  expect(mainButtons()).toEqual(["1 Chợ Bến Thành, Lê Lợi, Quận 1", "2 Bưu điện"]);
});

it("renders an empty state with a working add action when the day has no visible waypoint", async () => {
  const emptyAction = vi.fn();
  const { user, addButtonRef } = setup({ waypoints: [], emptyAction });

  expect(screen.getByRole("heading", { name: "Chưa có điểm đến nào trong Ngày 1" })).toBeTruthy();
  expect(screen.getByText("Dán tọa độ hoặc link Google Maps để thêm điểm đầu tiên.")).toBeTruthy();
  const add = screen.getByRole("button", { name: "Thêm điểm đến" });
  expect(addButtonRef.current).toBe(add);
  await user.click(add);
  expect(emptyAction).toHaveBeenCalledOnce();
});

it("shows the empty state when every waypoint of the day is pending deletion", () => {
  setup({ pendingIds: new Set(["w0", "w1", "w2"]) });

  expect(screen.getByRole("heading", { name: "Chưa có điểm đến nào trong Ngày 1" })).toBeTruthy();
  expect(screen.queryByRole("list", { name: "Điểm đến Ngày 1" })).toBeNull();
});

it("has no drag handle when the day has a single waypoint", () => {
  setup({ waypoints: [W0] });

  expect(screen.queryByRole("button", { name: /Kéo để sắp xếp/ })).toBeNull();
  expect(screen.getByRole("button", { name: /Thao tác cho "Chợ Bến Thành"/ })).toBeTruthy();
});

it("gives every handle the touch and Drawer swipe opt-outs, a 44px target and the instructions", () => {
  setup();

  const handle = handleOf(W0.name);
  expect(handle.hasAttribute("data-base-ui-swipe-ignore")).toBe(true);
  expect(handle.className).toContain("touch-none");
  expect(handle.className).toContain("size-touch");
  expect(handle.getAttribute("aria-roledescription")).toBe("điểm đến có thể sắp xếp");
});

it("calls onEdit from the main button and onRemove from the actions menu", async () => {
  const { user, onEdit, onRemove } = setup();

  await user.click(screen.getByRole("button", { name: "2 Dinh Độc Lập" }));
  expect(onEdit).toHaveBeenCalledWith(W1);

  await user.click(screen.getByRole("button", { name: 'Thao tác cho "Dinh Độc Lập"' }));
  await user.click(await screen.findByRole("menuitem", { name: "Xóa" }));
  expect(onRemove).toHaveBeenCalledWith(W1);
});

it("calls onEdit from the Sửa menu item", async () => {
  const { user, onEdit } = setup();

  await user.click(screen.getByRole("button", { name: 'Thao tác cho "Bưu điện"' }));
  await user.click(await screen.findByRole("menuitem", { name: "Sửa" }));

  expect(onEdit).toHaveBeenCalledWith(W2);
});

it("reorders with the keyboard in StrictMode: sends once, shows the new order at once, flushes the pending delete first", async () => {
  const { user, onFlushPending, store } = setup({ strict: true });

  await liftFirstDown(user);

  await waitFor(() => expect(mainButtons()[0]).toBe("1 Dinh Độc Lập"));
  expect(onFlushPending).toHaveBeenCalled();
  await waitFor(() => expect(h.reorderWaypoints).toHaveBeenCalledTimes(1));
  expect(h.reorderWaypoints).toHaveBeenCalledWith(ID, { dayNumber: 1, orderedIds: ["w1", "w0", "w2"] });
  await waitFor(() => expect(store.getSnapshot().hasSaved).toBe(true));
  expect(store.getSnapshot().failure).toBeNull();
});

it("keeps focus on the handle of the dropped card", async () => {
  const { user } = setup({ strict: true });

  await liftFirstDown(user);

  await waitFor(() => expect(document.activeElement).toBe(handleOf(W0.name)));
});

it("announces the drag in Vietnamese", async () => {
  const { user } = setup();

  handleOf(W0.name).focus();
  await user.keyboard(" ");

  // dnd-kit bắn `onDragOver` ngay sau `onDragStart` nên live region đọc câu "đang ở vị trí" (câu "Đã nhấc" được
  // kiểm riêng ở dnd-announcements.test.ts).
  await waitFor(() => expect(screen.getByText("Chợ Bến Thành đang ở vị trí 1 trên 3.")).toBeTruthy());
  await user.keyboard("{Escape}");
  await waitFor(() => expect(screen.getByText("Đã hủy. Chợ Bến Thành trở lại vị trí 1 trên 3.")).toBeTruthy());
});

it("does not send anything when the drag is cancelled with Escape", async () => {
  const { user } = setup();

  handleOf(W0.name).focus();
  await user.keyboard(" ");
  await user.keyboard("{ArrowDown}");
  await user.keyboard("{Escape}");
  await new Promise((resolve) => setTimeout(resolve, 20));

  expect(h.reorderWaypoints).not.toHaveBeenCalled();
  expect(mainButtons()[0]).toBe("1 Chợ Bến Thành, Lê Lợi, Quận 1");
});

it("does not send anything when the card is dropped where it started", async () => {
  const { user } = setup();

  handleOf(W0.name).focus();
  await user.keyboard(" ");
  await user.keyboard(" ");
  await new Promise((resolve) => setTimeout(resolve, 20));

  expect(h.reorderWaypoints).not.toHaveBeenCalled();
});

it("refuses to send a list that is not a permutation of the day's waypoints and refetches instead", async () => {
  // `w1` còn trong cache vì lệnh xóa chưa được flush (ở app thật `onFlushPending` chạy trước, test này không nối nó).
  const { user, store } = setup({ pendingIds: new Set(["w1"]) });
  const fetchesBefore = h.getById.mock.calls.length;

  await liftFirstDown(user);

  await waitFor(() => expect(notify.info).toHaveBeenCalledWith("Danh sách đã thay đổi, đã tải lại"));
  await waitFor(() => expect(h.getById.mock.calls.length).toBeGreaterThan(fetchesBefore));
  expect(h.reorderWaypoints).not.toHaveBeenCalled();
  expect(store.getSnapshot().failure).toBeNull();
});

it("rolls back, shows an error toast and marks the indicator failed when the BE rejects", async () => {
  h.reorderWaypoints.mockRejectedValue(makeApiError({ kind: "http", status: 500, code: "Server.Error", message: null }));
  const { user, store } = setup({ strict: true });

  await liftFirstDown(user);

  await waitFor(() => expect(store.getSnapshot().failure).not.toBeNull());
  await waitFor(() => expect(mainButtons()[0]).toBe("1 Chợ Bến Thành, Lê Lợi, Quận 1"));
  expect(notify.error).toHaveBeenCalledTimes(1);
});

it("retries the same reorder from the failure indicator", async () => {
  h.reorderWaypoints.mockRejectedValueOnce(makeApiError({ kind: "http", status: 500, code: "Server.Error", message: null }));
  const { user, store } = setup();

  await liftFirstDown(user);
  await waitFor(() => expect(store.getSnapshot().failure).not.toBeNull());
  store.getSnapshot().failure?.retry();

  await waitFor(() => expect(h.reorderWaypoints).toHaveBeenCalledTimes(2));
  expect(h.reorderWaypoints).toHaveBeenLastCalledWith(ID, { dayNumber: 1, orderedIds: ["w1", "w0", "w2"] });
});

it("treats Itinerary.InvalidReorderList as a refresh: info toast, refetch, no failure state", async () => {
  h.reorderWaypoints.mockRejectedValue(
    makeApiError({ kind: "http", status: 400, code: "Itinerary.InvalidReorderList", message: null }),
  );
  const { user, store } = setup();
  const fetchesBefore = h.getById.mock.calls.length;

  await liftFirstDown(user);

  await waitFor(() => expect(notify.info).toHaveBeenCalledWith("Danh sách đã thay đổi, đã tải lại"));
  await waitFor(() => expect(h.getById.mock.calls.length).toBeGreaterThan(fetchesBefore));
  expect(store.getSnapshot().failure).toBeNull();
  expect(notify.error).not.toHaveBeenCalled();
});

it("focuses the main button of the requested waypoint", async () => {
  setup({ focusRequest: { waypointId: "w1", target: "main" } });

  await waitFor(() => expect(document.activeElement).toBe(screen.getByRole("button", { name: "2 Dinh Độc Lập" })));
});

it("focuses the handle of the requested waypoint", async () => {
  setup({ focusRequest: { waypointId: "w2", target: "handle" } });

  await waitFor(() => expect(document.activeElement).toBe(handleOf(W2.name)));
});

it("focuses the add button when asked to", async () => {
  // Thanh "Thêm điểm đến" nằm ngoài danh sách (TimelinePanel) nên harness dựng một nút gắn vào `addButtonRef`.
  setup({ focusRequest: { waypointId: null, target: "add" }, externalAddButton: true });

  await waitFor(() => expect(document.activeElement).toBe(screen.getByRole("button", { name: "Thêm điểm đến" })));
});

it("highlights a freshly added waypoint", () => {
  setup({ highlightId: "w2" });

  const card = screen.getByRole("button", { name: "3 Bưu điện" }).closest("li");
  expect(card?.className).toContain("bg-primary-subtle");
  const other = screen.getByRole("button", { name: "2 Dinh Độc Lập" }).closest("li");
  expect(other?.className).not.toContain("bg-primary-subtle");
});
