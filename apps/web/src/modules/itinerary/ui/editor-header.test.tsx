import type { Viewer } from "@tripory/identity";
import type { Itinerary, Waypoint } from "@tripory/itinerary";
import { parseItineraryId, parseUserId } from "@tripory/shared-kernel";
import { createRef } from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { EditorHeader, EditorHeaderMinimal } from "./editor-header";

vi.mock("@/components/user-menu", () => ({
  UserMenu: ({ compact }: { compact?: boolean }) => <div data-compact={String(compact === true)} data-testid="user-menu" />,
}));
vi.mock("./save-indicator", () => ({
  SaveIndicator: () => <div data-testid="save-indicator" />,
}));

const ID = parseItineraryId("3f2a6c1e-8b7d-4e21-9c55-0a1b2c3d4e5f");
const OWNER = parseUserId("3f2504e0-4f89-11d3-9a0c-0305e82c3301");
if (ID === null || OWNER === null) throw new Error("dữ liệu mẫu phải hợp lệ");

const viewer: Viewer = {
  id: OWNER,
  email: "anh@tripory.vn",
  fullName: "Nguyễn Văn Ánh",
  handle: "anh",
  avatarUrl: null,
};

const waypoint: Waypoint = {
  id: "w1",
  dayNumber: 1,
  orderIndex: 0,
  name: "Hồ Xuân Hương",
  address: null,
  notes: null,
  coordinate: { latitude: 11.94, longitude: 108.44 },
};

const draft: Itinerary = {
  id: ID,
  ownerId: OWNER,
  title: "Đà Lạt 3 ngày",
  description: null,
  coverImageUrl: null,
  startDate: null,
  isPublic: false,
  totalDistanceKm: 0,
  days: [],
  waypoints: [waypoint],
};

const originalMatchMedia = window.matchMedia;

/** Nút Xuất bản hỏi `(min-width: 1024px)` để chọn tooltip hay dải giải thích: ở đây luôn là màn hẹp. */
beforeEach(() => {
  window.matchMedia = ((query: string) =>
    ({
      matches: false,
      media: query,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    }) as unknown as MediaQueryList) as typeof window.matchMedia;
});
afterEach(() => {
  window.matchMedia = originalMatchMedia;
  vi.useRealTimers();
});

function setup(itinerary: Itinerary = draft) {
  const handlers = {
    onBack: vi.fn(),
    onOpenTripInfo: vi.fn(),
    onDeleteItinerary: vi.fn(),
    onRequestPublish: vi.fn(),
  };
  const tripInfoButtonRef = createRef<HTMLButtonElement>();
  const view = render(
    <EditorHeader
      itinerary={itinerary}
      pendingIds={new Set()}
      tripInfoButtonRef={tripInfoButtonRef}
      {...handlers}
    />,
  );
  return { ...handlers, tripInfoButtonRef, ...view };
}

it("shows the title as a truncated h1 and goes back through onBack", async () => {
  const user = userEvent.setup();
  const { onBack } = setup();
  const title = screen.getByRole("heading", { level: 1, name: "Đà Lạt 3 ngày" });
  expect(title.className).toContain("truncate");
  await user.click(screen.getByRole("button", { name: "Về Lịch trình của tôi" }));
  expect(onBack).toHaveBeenCalledTimes(1);
});

it("is a sticky header on the sticky layer", () => {
  setup();
  const header = screen.getByRole("banner");
  expect(header.className).toContain("sticky");
  expect(header.className).toContain("top-0");
  expect(header.className).toContain("z-sticky");
});

it("a draft offers Xuất bản and no share action", async () => {
  const user = userEvent.setup();
  const { onRequestPublish } = setup();
  expect(screen.queryByText(/Chia s\u1EBB/)).toBeNull();
  await user.click(screen.getByRole("button", { name: "Xuất bản" }));
  expect(onRequestPublish).toHaveBeenCalledTimes(1);
});

it("a published itinerary hides Xuất bản and shows only the title in the title block", () => {
  setup({ ...draft, isPublic: true });
  expect(screen.queryByRole("button", { name: "Xuất bản" })).toBeNull();
  expect(screen.getByRole("heading", { level: 1 }).parentElement?.children.length).toBe(1);
  expect(screen.queryByText(/Chia s\u1EBB/)).toBeNull();
});

it("puts the info icon right after the title block and opens trip info", async () => {
  const user = userEvent.setup();
  const { onOpenTripInfo } = setup();
  const info = screen.getByRole("button", { name: "Thông tin chuyến đi" });
  const titleBlock = screen.getByRole("heading", { level: 1 }).parentElement as HTMLElement;
  expect(titleBlock.nextElementSibling).toBe(info);
  expect(info.className).toContain("shrink-0");
  expect(titleBlock.className).toContain("min-w-0");
  await user.click(info);
  expect(onOpenTripInfo).toHaveBeenCalledTimes(1);
});

it("puts the delete button outside any menu, in the right side, and asks to delete the itinerary", async () => {
  const user = userEvent.setup();
  const { onDeleteItinerary } = setup();
  const remove = screen.getByRole("button", { name: "Xóa lịch trình" });
  const actions = screen.getByTestId("save-indicator").parentElement as HTMLElement;
  expect(actions.contains(remove)).toBe(true);
  expect(remove.className).toContain("text-danger");
  expect(remove.getAttribute("aria-haspopup")).toBeNull();
  await user.click(remove);
  expect(onDeleteItinerary).toHaveBeenCalledTimes(1);
});

it("no longer has the ⋯ menu or the user menu", () => {
  setup();
  expect(screen.queryByRole("button", { name: "Thao tác lịch trình" })).toBeNull();
  expect(screen.queryByRole("menuitem")).toBeNull();
  expect(screen.queryByTestId("user-menu")).toBeNull();
});

it("exposes the info button ref for focus restoration", () => {
  const { tripInfoButtonRef } = setup();
  expect(tripInfoButtonRef.current).toBe(screen.getByRole("button", { name: "Thông tin chuyến đi" }));
});

it("keeps a 44px touch target on every icon button while the icons are size sm", () => {
  setup();
  const names = ["Về Lịch trình của tôi", "Thông tin chuyến đi", "Xóa lịch trình", "Xuất bản"];
  for (const name of names) {
    const button = screen.getByRole("button", { name });
    expect(button.className).toContain("min-w-touch");
    expect(button.className).toContain("min-h-touch");
    const icon = button.querySelector("svg");
    expect(icon?.getAttribute("class")).toContain("size-(--spinner-size-sm)");
  }
});

it("contains the save indicator", () => {
  setup();
  expect(screen.getAllByTestId("save-indicator")).toHaveLength(1);
});

it("puts save indicator, Xuất bản and the delete button together in the right side of the header", () => {
  setup();
  const header = screen.getByRole("banner");
  const actions = screen.getByTestId("save-indicator").parentElement as HTMLElement;
  expect(header.contains(actions)).toBe(true);
  expect(actions.contains(screen.getByRole("button", { name: "Xuất bản" }))).toBe(true);
  expect(actions.contains(screen.getByRole("heading", { level: 1 }))).toBe(false);
  expect(actions.className).toContain("shrink-0");
});

it("has a single row at every width: no separate row for the save indicator and Xuất bản", () => {
  setup();
  expect(screen.getByRole("banner").querySelector(".border-t")).toBeNull();
});

it("the title block shrinks and truncates to make room for the right side", () => {
  setup();
  const block = screen.getByRole("heading", { level: 1 }).parentElement as HTMLElement;
  expect(block.className).toContain("min-w-0");
  const wrapper = block.parentElement as HTMLElement;
  expect(wrapper.className).toContain("min-w-0");
  expect(wrapper.className).toContain("flex-1");
});

it("below md Xuất bản keeps its accessible name through a screen-reader-only label", () => {
  setup();
  const button = screen.getByRole("button", { name: "Xuất bản" });
  const label = screen.getByText("Xuất bản", { selector: "span" });
  expect(button.contains(label)).toBe(true);
  expect(label.className).toContain("sr-only");
  expect(label.className).toContain("md:not-sr-only");
  expect(button.className).toContain("min-w-touch");
});

it("a blocked Xuất bản stays focusable below md and keeps its explanation", async () => {
  const user = userEvent.setup();
  setup({ ...draft, waypoints: [] });
  const button = screen.getByRole("button", { name: "Xuất bản" });
  expect(button.getAttribute("aria-disabled")).toBe("true");
  await user.tab();
  await user.tab();
  await user.tab();
  expect(document.activeElement).toBe(button);
  expect(document.getElementById(button.getAttribute("aria-describedby") as string)?.textContent).toBe(
    "Thêm ít nhất 1 điểm đến để xuất bản",
  );
});

it("a blocked press shows the hint strip for 4 seconds, then hides it", () => {
  vi.useFakeTimers();
  setup({ ...draft, waypoints: [] });
  const button = screen.getByRole("button", { name: "Xuất bản" });
  const hint = document.getElementById(button.getAttribute("aria-describedby") as string) as HTMLElement;
  expect(hint.textContent).toBe("Thêm ít nhất 1 điểm đến để xuất bản");
  expect(hint.hasAttribute("hidden")).toBe(true);

  fireEvent.click(button);
  expect(hint.hasAttribute("hidden")).toBe(false);
  act(() => {
    vi.advanceTimersByTime(3999);
  });
  expect(hint.hasAttribute("hidden")).toBe(false);
  act(() => {
    vi.advanceTimersByTime(1);
  });
  expect(hint.hasAttribute("hidden")).toBe(true);
});

it("the minimal header has back, title and user menu but no edit actions", async () => {
  const user = userEvent.setup();
  const onBack = vi.fn();
  render(<EditorHeaderMinimal onBack={onBack} title="Sửa lịch trình" viewer={viewer} />);
  expect(screen.getByRole("heading", { level: 1, name: "Sửa lịch trình" })).toBeTruthy();
  expect(screen.getByTestId("user-menu").getAttribute("data-compact")).toBe("true");
  expect(screen.queryByRole("button", { name: "Xuất bản" })).toBeNull();
  expect(screen.queryByRole("button", { name: "Thao tác lịch trình" })).toBeNull();
  expect(screen.queryByTestId("save-indicator")).toBeNull();
  await user.click(screen.getByRole("button", { name: "Về Lịch trình của tôi" }));
  expect(onBack).toHaveBeenCalledTimes(1);
});

it("the minimal header without a title shows a skeleton instead of a heading", () => {
  render(<EditorHeaderMinimal onBack={vi.fn()} viewer={viewer} />);
  expect(screen.queryByRole("heading")).toBeNull();
});
