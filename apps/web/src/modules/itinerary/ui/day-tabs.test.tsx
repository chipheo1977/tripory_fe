import { makeApiError } from "@tripory/api-client";
import type { EditorTab, Itinerary } from "@tripory/itinerary";
import { itineraryKeys } from "@tripory/itinerary/react";
import { parseItineraryId, parseUserId } from "@tripory/shared-kernel";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { makeQueryClient } from "@/composition/query-client";
import { DayTabs } from "./day-tabs";
import { createSaveStatusStore, SaveStatusProvider } from "./save-status";

const h = vi.hoisted(() => ({
  setDaySubtitle: vi.fn(),
  getById: vi.fn(),
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
        updateMetadata: unused,
        publish: unused,
        remove: unused,
        addWaypoint: unused,
        updateWaypoint: unused,
        deleteWaypoint: unused,
        reorderWaypoints: unused,
        setDaySubtitle: (id: string, day: number, subtitle: string | null) => h.setDaySubtitle(id, day, subtitle),
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
if (ID === null || OWNER === null) throw new Error("dữ liệu mẫu phải hợp lệ");

// Ngày 1 có km, ngày 3 có phụ đề; ngày 2 thưa (không có bản ghi) nên hiện như ngày trống.
const base: Itinerary = {
  id: ID,
  ownerId: OWNER,
  title: "Đà Lạt",
  description: null,
  coverImageUrl: null,
  coverImages: [],
  destinationCode: null,
  interests: [],
  startDate: null,
  isPublic: false,
  totalDistanceKm: 12.4,
  days: [
    { dayNumber: 1, subtitle: null, distanceKm: 12.4 },
    { dayNumber: 3, subtitle: "Biển", distanceKm: null },
  ],
  waypoints: [],
};

const scrollIntoView = vi.fn();
const originalMatchMedia = window.matchMedia;

const setReducedMotion = (reduced: boolean) => {
  window.matchMedia = ((query: string) =>
    ({
      matches: reduced && query.includes("prefers-reduced-motion"),
      media: query,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    }) as unknown as MediaQueryList) as typeof window.matchMedia;
};

function setup(initialTab: EditorTab = 1, totalKm: number = base.totalDistanceKm) {
  const user = userEvent.setup();
  const store = createSaveStatusStore();
  const queryClient = makeQueryClient();
  queryClient.setQueryData(itineraryKeys.detail(ID!), { ...base, totalDistanceKm: totalKm });
  const onSelectDay = vi.fn();

  function Harness() {
    const [tab, setTab] = useState<EditorTab>(initialTab);
    const { data } = useQuery({
      queryKey: itineraryKeys.detail(ID!),
      queryFn: () => h.getById() as Promise<Itinerary>,
      staleTime: Infinity,
    });
    if (data === undefined) return null;
    return (
      <DayTabs
        itinerary={data}
        onSelectTab={(next) => {
          onSelectDay(next);
          setTab(next);
        }}
        selectedTab={tab}
      />
    );
  }

  render(
    <QueryClientProvider client={queryClient}>
      <SaveStatusProvider store={store}>
        <Harness />
      </SaveStatusProvider>
    </QueryClientProvider>,
  );
  return { user, store, onSelectDay };
}

const addButton = () => screen.getByRole("button", { name: "Thêm ngày" });

beforeEach(() => {
  scrollIntoView.mockClear();
  Element.prototype.scrollIntoView = scrollIntoView;
  setReducedMotion(false);
  h.setDaySubtitle.mockReset();
  h.setDaySubtitle.mockResolvedValue(undefined);
  h.getById.mockReset();
  h.getById.mockImplementation(async () => base);
});

afterEach(() => {
  window.matchMedia = originalMatchMedia;
});

it("draws Ngày 1 to the largest day, sparse days as empty tabs, with the BE km line", () => {
  setup();

  const tabs = screen.getAllByRole("tab");
  expect(tabs.map((tab) => tab.getAttribute("aria-label"))).toEqual(["Tổng quan, 12,4 km", "Ngày 1, 12,4 km", "Ngày 2", "Ngày 3"]);
  expect(within(screen.getByRole("tab", { name: "Ngày 1, 12,4 km" })).getByText("12,4 km")).toBeTruthy();
  expect(screen.getByRole("tab", { name: "Ngày 2" }).textContent).toBe("Ngày 2");
});

it("keeps 'Thêm ngày' outside the tablist and out of the tab roles", () => {
  setup();

  const button = addButton();
  expect(button.getAttribute("role")).toBeNull();
  expect(screen.getByRole("tablist").contains(button)).toBe(false);
  expect(screen.queryByRole("tab", { name: /Thêm ngày/ })).toBeNull();
});

it("selecting a tab reports that day", async () => {
  const { user, onSelectDay } = setup();

  await user.click(screen.getByRole("tab", { name: "Ngày 2" }));

  expect(onSelectDay).toHaveBeenCalledWith(2);
});

it("adds the next day at once, selects and focuses it, and saves a null subtitle", async () => {
  let release!: () => void;
  h.setDaySubtitle.mockImplementation(
    () =>
      new Promise<void>((resolve) => {
        release = resolve;
      }),
  );
  const { user, onSelectDay } = setup();

  await user.click(addButton());

  const tab = await screen.findByRole("tab", { name: "Ngày 4" });
  expect(onSelectDay).toHaveBeenCalledWith(4);
  await waitFor(() => expect(document.activeElement).toBe(tab));
  expect(tab.getAttribute("aria-selected")).toBe("true");
  await waitFor(() => expect(h.setDaySubtitle).toHaveBeenCalledTimes(1));
  expect(h.setDaySubtitle).toHaveBeenCalledWith(ID, 4, null);

  await act(async () => {
    release();
  });
});

it("marks the store saved when adding a day succeeds", async () => {
  const { user, store } = setup();

  await user.click(addButton());

  await waitFor(() => expect(store.getSnapshot().hasSaved).toBe(true));
  expect(store.getSnapshot().failure).toBeNull();
});

it("rolls back a failed add: tab gone, previous day selected, focus on the button, retry resends", async () => {
  h.setDaySubtitle.mockRejectedValue(makeApiError({ kind: "http", status: 500, code: null, message: null }));
  const { user, store, onSelectDay } = setup(3);

  await user.click(addButton());

  await waitFor(() => expect(store.getSnapshot().failure).not.toBeNull());
  await waitFor(() => expect(screen.queryByRole("tab", { name: "Ngày 4" })).toBeNull());
  expect(onSelectDay).toHaveBeenLastCalledWith(3);
  expect(document.activeElement).toBe(addButton());

  act(() => store.getSnapshot().failure?.retry());

  await waitFor(() => expect(h.setDaySubtitle).toHaveBeenCalledTimes(2));
  expect(h.setDaySubtitle).toHaveBeenLastCalledWith(ID, 4, null);
});

it("scrolls the selected tab into view with nearest alignment", async () => {
  const { user } = setup();
  scrollIntoView.mockClear();

  await user.click(screen.getByRole("tab", { name: "Ngày 3" }));

  await waitFor(() =>
    expect(scrollIntoView).toHaveBeenCalledWith({ inline: "nearest", block: "nearest", behavior: "smooth" }),
  );
});

it("uses behavior 'auto' when the user prefers reduced motion", async () => {
  setReducedMotion(true);
  const { user } = setup();
  scrollIntoView.mockClear();

  await user.click(screen.getByRole("tab", { name: "Ngày 3" }));

  await waitFor(() =>
    expect(scrollIntoView).toHaveBeenCalledWith({ inline: "nearest", block: "nearest", behavior: "auto" }),
  );
});

it("puts the Overview tab before Ngày 1 with the BE total km as its second line", () => {
  setup();
  const tabs = screen.getAllByRole("tab");
  expect(tabs[0]?.getAttribute("aria-label")).toBe("Tổng quan, 12,4 km");
  expect(tabs[1]?.getAttribute("aria-label")).toBe("Ngày 1, 12,4 km");
  expect(within(tabs[0] as HTMLElement).getByText("Tổng quan")).toBeTruthy();
  expect(within(tabs[0] as HTMLElement).getByText("12,4 km")).toBeTruthy();
});

it("names the Overview tab without km and draws no second line when the BE total is 0", () => {
  setup(1, 0);
  const overview = screen.getAllByRole("tab")[0] as HTMLElement;
  expect(overview.getAttribute("aria-label")).toBe("Tổng quan");
  expect(overview.textContent).toBe("Tổng quan");
});

it("gives every day tab an aria-hidden colour dot matching its day colour (cycle of 8)", () => {
  setup();
  const dayTabs = screen.getAllByRole("tab").slice(1);
  dayTabs.forEach((tab, index) => {
    const dot = tab.querySelector("[aria-hidden='true']");
    expect(dot).not.toBeNull();
    expect(dot?.className.split(/\s+/)).toContain(`bg-map-day-${index + 1}`);
  });
  expect(screen.getAllByRole("tab")[0]?.querySelector("[aria-hidden='true']")).toBeNull();
});

it("selecting the Overview tab reports 'overview'", async () => {
  const { user, onSelectDay } = setup(2);
  await user.click(screen.getByRole("tab", { name: /^Tổng quan/ }));
  expect(onSelectDay).toHaveBeenCalledWith("overview");
  expect(screen.getByRole("tab", { name: /^Tổng quan/ }).getAttribute("aria-selected")).toBe("true");
});

it("adding a day while on the Overview tab selects the new day", async () => {
  h.setDaySubtitle.mockImplementation(() => new Promise<void>(() => undefined));
  const { user, onSelectDay } = setup("overview");
  await user.click(addButton());
  await screen.findByRole("tab", { name: "Ngày 4" });
  expect(onSelectDay).toHaveBeenCalledWith(4);
});