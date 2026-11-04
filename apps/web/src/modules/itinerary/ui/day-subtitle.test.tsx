import { makeApiError } from "@tripory/api-client";
import { buildDayRange, type Itinerary } from "@tripory/itinerary";
import { itineraryKeys } from "@tripory/itinerary/react";
import { parseItineraryId, parseUserId } from "@tripory/shared-kernel";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, it, vi } from "vitest";
import { makeQueryClient } from "@/composition/query-client";
import { DaySubtitle } from "./day-subtitle";
import { createSaveStatusStore, SaveStatusProvider } from "./save-status";

const h = vi.hoisted(() => ({ setDaySubtitle: vi.fn(), getById: vi.fn() }));

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

// Ngày 1 không có phụ đề, ngày 2 có "Quận 1".
const base: Itinerary = {
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
    { dayNumber: 1, subtitle: null, distanceKm: null },
    { dayNumber: 2, subtitle: "Quận 1", distanceKm: null },
  ],
  waypoints: [],
};

function setup(dayNumber: 1 | 2 = 2) {
  const user = userEvent.setup();
  const store = createSaveStatusStore();
  const queryClient = makeQueryClient();
  queryClient.setQueryData(itineraryKeys.detail(ID!), base);

  function Harness() {
    const { data } = useQuery({
      queryKey: itineraryKeys.detail(ID!),
      queryFn: () => h.getById() as Promise<Itinerary>,
      staleTime: Infinity,
    });
    if (data === undefined) return null;
    const day = buildDayRange(data).find((d) => d.dayNumber === dayNumber);
    return day === undefined ? null : <DaySubtitle day={day} itineraryId={ID!} />;
  }

  render(
    <QueryClientProvider client={queryClient}>
      <SaveStatusProvider store={store}>
        <Harness />
      </SaveStatusProvider>
    </QueryClientProvider>,
  );
  return { user, store };
}

const viewButton = (name: string | RegExp) => screen.getByRole("button", { name });
const field = (day = 2) => screen.getByRole("textbox", { name: `Phụ đề Ngày ${day}` }) as HTMLInputElement;

beforeEach(() => {
  h.setDaySubtitle.mockReset();
  h.setDaySubtitle.mockResolvedValue(undefined);
  h.getById.mockReset();
  h.getById.mockImplementation(async () => base);
});

it("shows an add prompt when the day has no subtitle", () => {
  setup(1);

  const button = viewButton("Thêm phụ đề cho Ngày 1");
  expect(button.textContent).toBe("Thêm phụ đề cho ngày này");
});

it("shows the subtitle with an edit name when the day has one", () => {
  setup(2);

  const button = viewButton("Sửa phụ đề Ngày 2: Quận 1");
  expect(button.textContent).toBe("Quận 1");
});

it("clicking opens a focused input with the caret at the end", async () => {
  const { user } = setup(2);

  await user.click(viewButton(/Sửa phụ đề Ngày 2/));

  const input = field();
  await waitFor(() => expect(document.activeElement).toBe(input));
  expect(input.value).toBe("Quận 1");
  expect(input.selectionStart).toBe(6);
  expect(input.selectionEnd).toBe(6);
});

it("Enter trims, saves optimistically and returns to the view with the new value", async () => {
  let release!: () => void;
  h.setDaySubtitle.mockImplementation(
    () =>
      new Promise<void>((resolve) => {
        release = resolve;
      }),
  );
  const { user } = setup(2);
  await user.click(viewButton(/Sửa phụ đề Ngày 2/));

  await user.clear(field());
  await user.type(field(), "  Chợ  {Enter}");

  await waitFor(() => expect(viewButton("Sửa phụ đề Ngày 2: Chợ")).toBeTruthy());
  expect(h.setDaySubtitle).toHaveBeenCalledTimes(1);
  expect(h.setDaySubtitle).toHaveBeenCalledWith(ID, 2, "Chợ");
  expect(document.activeElement).toBe(viewButton(/Sửa phụ đề Ngày 2/));
  release();
});

it("clearing the text and blurring sends null", async () => {
  const { user } = setup(2);
  await user.click(viewButton(/Sửa phụ đề Ngày 2/));

  await user.clear(field());
  await user.tab();

  await waitFor(() => expect(h.setDaySubtitle).toHaveBeenCalledWith(ID, 2, null));
  expect(h.setDaySubtitle).toHaveBeenCalledTimes(1);
});

it("Enter followed by blur sends only once", async () => {
  const { user } = setup(1);
  await user.click(viewButton("Thêm phụ đề cho Ngày 1"));

  await user.type(field(1), "Biển{Enter}");
  await user.tab();

  await waitFor(() => expect(h.setDaySubtitle).toHaveBeenCalledTimes(1));
});

it("an unchanged value (after trim) is not sent", async () => {
  const { user } = setup(2);
  await user.click(viewButton(/Sửa phụ đề Ngày 2/));

  await user.type(field(), "  {Enter}");

  await waitFor(() => expect(viewButton("Sửa phụ đề Ngày 2: Quận 1")).toBeTruthy());
  expect(h.setDaySubtitle).not.toHaveBeenCalled();
});

it("an empty subtitle that stays empty is not sent", async () => {
  const { user } = setup(1);
  await user.click(viewButton("Thêm phụ đề cho Ngày 1"));

  await user.keyboard("{Enter}");

  expect(h.setDaySubtitle).not.toHaveBeenCalled();
  expect(viewButton("Thêm phụ đề cho Ngày 1")).toBeTruthy();
});

it("over 100 characters stays in edit mode with the error and aria-invalid", async () => {
  const { user } = setup(1);
  await user.click(viewButton("Thêm phụ đề cho Ngày 1"));

  await user.click(field(1));
  await user.paste("a".repeat(101));
  await user.keyboard("{Enter}");

  expect(field(1)).toBeTruthy();
  expect(await screen.findByText("Phụ đề tối đa 100 ký tự.")).toBeTruthy();
  expect(field(1).getAttribute("aria-invalid")).toBe("true");
  expect(h.setDaySubtitle).not.toHaveBeenCalled();
});

it("Esc restores the old value, focuses the view button and sends nothing", async () => {
  const { user } = setup(2);
  await user.click(viewButton(/Sửa phụ đề Ngày 2/));

  await user.type(field(), " mới");
  await user.keyboard("{Escape}");

  const button = viewButton("Sửa phụ đề Ngày 2: Quận 1");
  await waitFor(() => expect(document.activeElement).toBe(button));
  expect(h.setDaySubtitle).not.toHaveBeenCalled();
});

it("a failed save restores the old value and records a retryable failure", async () => {
  h.setDaySubtitle.mockRejectedValue(makeApiError({ kind: "http", status: 500, code: null, message: null }));
  const { user, store } = setup(2);
  await user.click(viewButton(/Sửa phụ đề Ngày 2/));

  await user.clear(field());
  await user.type(field(), "Chợ{Enter}");

  await waitFor(() => expect(store.getSnapshot().failure).not.toBeNull());
  await waitFor(() => expect(viewButton("Sửa phụ đề Ngày 2: Quận 1")).toBeTruthy());

  store.getSnapshot().failure?.retry();

  await waitFor(() => expect(h.setDaySubtitle).toHaveBeenCalledTimes(2));
  expect(h.setDaySubtitle).toHaveBeenLastCalledWith(ID, 2, "Chợ");
});

it("marks the store saved after a successful save", async () => {
  const { user, store } = setup(1);
  await user.click(viewButton("Thêm phụ đề cho Ngày 1"));

  await user.type(field(1), "Biển{Enter}");

  await waitFor(() => expect(store.getSnapshot().hasSaved).toBe(true));
});
