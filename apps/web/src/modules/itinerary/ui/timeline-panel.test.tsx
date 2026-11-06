import { buildDayRange, type Itinerary, type Waypoint } from "@tripory/itinerary";
import { createWgs84Coordinate, parseItineraryId, parseUserId } from "@tripory/shared-kernel";
import { QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { makeQueryClient } from "@/composition/query-client";
import { createSaveStatusStore, SaveStatusProvider } from "./save-status";
import { DayPanel, type DayPanelProps } from "./day-panel";
import { DayTabs } from "./day-tabs";
import { TimelineHostProvider, TimelinePanel, type TimelineHost } from "./timeline-panel";

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

type SetupOptions = Readonly<{
  selectedDay?: number;
  pendingIds?: ReadonlySet<string>;
  selection?: DayPanelProps["list"]["selection"];
}>;

function setup(options: SetupOptions = {}) {
  const user = userEvent.setup();
  const day = buildDayRange(itinerary).find((candidate) => candidate.dayNumber === (options.selectedDay ?? 1))!;
  const props = {
    onSelectTab: vi.fn(),
    onAdd: vi.fn(),
    onEdit: vi.fn(),
    addButtonRef: createRef<HTMLButtonElement>(),
  };
  const { container } = render(
    <QueryClientProvider client={makeQueryClient()}>
      <SaveStatusProvider store={createSaveStatusStore()}>
        <TimelinePanel
          tabs={<DayTabs itinerary={itinerary} onSelectTab={props.onSelectTab} selectedTab={day.dayNumber} />}
        >
          <DayPanel
            addButtonRef={props.addButtonRef}
            day={day}
            feedback={{ highlightId: null, focusRequest: null }}
            itinerary={itinerary}
            list={{ onEdit: props.onEdit, onFlushPending: vi.fn(), onRemove: vi.fn(), selection: options.selection }}
            onAdd={props.onAdd}
            pendingIds={options.pendingIds ?? new Set()}
          />
        </TimelinePanel>
      </SaveStatusProvider>
    </QueryClientProvider>,
  );
  return { user, props, container };
}

it("renders the tab bar in a sticky strip, then the subtitle and the waypoints of the selected day", () => {
  const { container } = setup();
  const strip = container.querySelector(".sticky.top-0");
  expect(strip).not.toBeNull();
  expect(within(strip as HTMLElement).getByRole("tablist", { name: "Các ngày" })).toBeTruthy();
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

it("calls onSelectTab when another tab is chosen", async () => {
  const { user, props } = setup();
  await user.click(screen.getByRole("tab", { name: "Ngày 2" }));
  expect(props.onSelectTab).toHaveBeenCalledWith(2);
});

it("passes the selection down: the main button selects the waypoint instead of editing", async () => {
  const onSelect = vi.fn();
  const { user, props } = setup({ selection: { selectedId: "w2", onSelect } });
  await user.click(screen.getByRole("button", { name: "1 Chợ Bến Thành" }));
  expect(onSelect).toHaveBeenCalledWith(itinerary.waypoints[0]);
  expect(props.onEdit).not.toHaveBeenCalled();
  expect(screen.getByRole("button", { name: "2 Dinh Độc Lập" }).getAttribute("aria-current")).toBe("true");
});

it("without a selection the main button edits", async () => {
  const { user, props } = setup();
  await user.click(screen.getByRole("button", { name: "1 Chợ Bến Thành" }));
  expect(props.onEdit).toHaveBeenCalledWith(itinerary.waypoints[0]);
});

describe("trong Sheet (TimelineHostProvider)", () => {
  const renderInSheet = (host: TimelineHost, scrollResetKey: string | number = 0) =>
    render(
      <TimelineHostProvider value={host}>
        <TimelinePanel scrollResetKey={scrollResetKey} tabs={<div role="tablist">tab</div>}>
          <p>nội dung</p>
        </TimelinePanel>
      </TimelineHostProvider>,
    );
  const scroller = () => document.querySelector<HTMLElement>("[data-timeline-scroller]") as HTMLElement;

  it("hàng tab nằm ngoài vùng cuộn (đứng yên), thân nằm trong vùng cuộn duy nhất", () => {
    renderInSheet({ hiddenBottom: 270, scrollable: true });

    expect(scroller().contains(screen.getByRole("tablist"))).toBe(false);
    expect(scroller().contains(screen.getByText("nội dung"))).toBe(true);
    expect(document.querySelectorAll("[data-timeline-scroller]")).toHaveLength(1);
  });

  it("vùng cuộn: cao đúng phần nhìn thấy (bottom = phần bị che), chỉ cuộn dọc, không kéo sheet khi vuốt, không lan cuộn", () => {
    renderInSheet({ hiddenBottom: 270, scrollable: true });

    expect(scroller().style.bottom).toBe("270px");
    expect(scroller().className.split(/\s+/)).toEqual(expect.arrayContaining(["overflow-y-auto", "overscroll-contain", "touch-pan-y"]));
    expect(scroller().hasAttribute("data-base-ui-swipe-ignore")).toBe(true);
  });

  it("peek (scrollable=false): không cuộn và về đầu", () => {
    const { rerender } = renderInSheet({ hiddenBottom: 270, scrollable: true });
    scroller().scrollTop = 80;

    rerender(
      <TimelineHostProvider value={{ hiddenBottom: 270, scrollable: false }}>
        <TimelinePanel tabs={<div role="tablist">tab</div>}>
          <p>nội dung</p>
        </TimelinePanel>
      </TimelineHostProvider>,
    );

    expect(scroller().className.split(/\s+/)).toContain("overflow-y-hidden");
    expect(scroller().className.split(/\s+/)).not.toContain("overflow-y-auto");
    expect(scroller().scrollTop).toBe(0);
  });

  it("đổi scrollResetKey (đổi tab) thì về đầu", () => {
    const { rerender } = renderInSheet({ hiddenBottom: 0, scrollable: true }, "overview");
    scroller().scrollTop = 80;

    rerender(
      <TimelineHostProvider value={{ hiddenBottom: 0, scrollable: true }}>
        <TimelinePanel scrollResetKey={1} tabs={<div role="tablist">tab</div>}>
          <p>nội dung</p>
        </TimelinePanel>
      </TimelineHostProvider>,
    );

    expect(scroller().scrollTop).toBe(0);
  });

  it("ngoài Sheet không có vùng cuộn riêng", () => {
    render(
      <TimelinePanel tabs={<div role="tablist">tab</div>}>
        <p>nội dung</p>
      </TimelinePanel>,
    );

    expect(document.querySelector("[data-timeline-scroller]")).toBeNull();
  });
});