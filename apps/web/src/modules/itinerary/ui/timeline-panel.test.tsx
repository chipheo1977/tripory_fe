import type { Itinerary, Waypoint } from "@tripory/itinerary";
import { createWgs84Coordinate, parseItineraryId, parseUserId } from "@tripory/shared-kernel";
import { QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { beforeEach, expect, it, vi } from "vitest";
import { makeQueryClient } from "@/composition/query-client";
import { createSaveStatusStore, SaveStatusProvider } from "./save-status";
import { TimelinePanel, type TimelinePanelProps } from "./timeline-panel";

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
const COORD = createWgs84Coordinate({ latitude: 10.7769, longitude: 106.7009 });
if (ID === null || OWNER === null || COORD === null) throw new Error("dữ liệu mẫu phải hợp lệ");

const waypoint = (id: string, name: string, dayNumber: number, orderIndex: number): Waypoint => ({
  id,
  dayNumber,
  orderIndex,
  name,
  address: null,
  notes: null,
  coordinate: COORD,
});

const itinerary: Itinerary = {
  id: ID,
  ownerId: OWNER,
  title: "Sài Gòn",
  description: null,
  coverImageUrl: null,
  coverImages: [],
  destinationCode: null,
  interests: [],
  startDate: null,
  isPublic: false,
  totalDistanceKm: 0,
  days: [
    { dayNumber: 1, subtitle: "Trung tâm", distanceKm: null },
    { dayNumber: 2, subtitle: null, distanceKm: null },
  ],
  waypoints: [waypoint("w1", "Chợ Bến Thành", 1, 0), waypoint("w2", "Dinh Độc Lập", 1, 1)],
};

beforeEach(() => {
  Element.prototype.scrollIntoView = vi.fn();
});

function setup(overrides: Partial<TimelinePanelProps> = {}) {
  const user = userEvent.setup();
  const props: TimelinePanelProps = {
    itinerary,
    selectedDay: 1,
    onSelectDay: vi.fn(),
    pendingIds: new Set(),
    onRemove: vi.fn(),
    onFlushPending: vi.fn(),
    onAdd: vi.fn(),
    onEdit: vi.fn(),
    highlightId: null,
    focusRequest: null,
    addButtonRef: createRef<HTMLButtonElement>(),
    ...overrides,
  };
  const { container } = render(
    <QueryClientProvider client={makeQueryClient()}>
      <SaveStatusProvider store={createSaveStatusStore()}>
        <TimelinePanel {...props} />
      </SaveStatusProvider>
    </QueryClientProvider>,
  );
  return { user, props, container };
}

it("renders the day tabs, the subtitle and the waypoints of the selected day", () => {
  setup();
  expect(screen.getByRole("tablist", { name: "Các ngày" })).toBeTruthy();
  expect(screen.getByRole("button", { name: "Sửa phụ đề Ngày 1: Trung tâm" })).toBeTruthy();
  const list = screen.getByRole("list", { name: "Điểm đến Ngày 1" });
  expect(within(list).getByText("Chợ Bến Thành")).toBeTruthy();
  expect(within(list).getByText("Dinh Độc Lập")).toBeTruthy();
});

it("shows one 'Thêm điểm đến' bar for a day with waypoints and calls onAdd with the selected day", async () => {
  const { user, props } = setup();
  const buttons = screen.getAllByRole("button", { name: "Thêm điểm đến" });
  expect(buttons).toHaveLength(1);
  expect(props.addButtonRef.current).toBe(buttons[0]);
  await user.click(buttons[0]!);
  expect(props.onAdd).toHaveBeenCalledWith(1);
  expect(screen.queryByText("Chưa có điểm đến nào trong Ngày 1")).toBeNull();
});

it("shows the empty state with a primary CTA instead of the bar for an empty day", async () => {
  const { user, props } = setup({ selectedDay: 2 });
  expect(screen.getByText("Chưa có điểm đến nào trong Ngày 2")).toBeTruthy();
  const buttons = screen.getAllByRole("button", { name: "Thêm điểm đến" });
  expect(buttons).toHaveLength(1);
  expect(props.addButtonRef.current).toBe(buttons[0]);
  await user.click(buttons[0]!);
  expect(props.onAdd).toHaveBeenCalledWith(2);
});

it("treats a day whose waypoints are all pending delete as empty", () => {
  setup({ pendingIds: new Set(["w1", "w2"]) });
  expect(screen.getByText("Chưa có điểm đến nào trong Ngày 1")).toBeTruthy();
  expect(screen.getAllByRole("button", { name: "Thêm điểm đến" })).toHaveLength(1);
});

it("leaves the sticky bar empty (collapsed by empty:hidden) when the day has no visible waypoints", () => {
  const { container } = setup({ selectedDay: 2 });
  const bar = container.querySelector(".sticky.bottom-0");
  expect(bar).not.toBeNull();
  expect(bar?.childNodes.length).toBe(0);
  expect(bar?.className).toContain("empty:hidden");
});

it("puts the button inside the sticky bar when the day has visible waypoints", () => {
  const { container } = setup();
  const bar = container.querySelector(".sticky.bottom-0");
  expect(within(bar as HTMLElement).getByRole("button", { name: "Thêm điểm đến" })).toBeTruthy();
});

it("calls onSelectDay when another tab is chosen", async () => {
  const { user, props } = setup();
  await user.click(screen.getByRole("tab", { name: "Ngày 2" }));
  expect(props.onSelectDay).toHaveBeenCalledWith(2);
});
