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

/** Mặc định dưới `sm`; `true` mô phỏng từ `sm` (min-width 640px). */
const setSm = (sm: boolean) => {
  window.matchMedia = ((query: string) =>
    ({
      matches: sm && query.includes("640px"),
      media: query,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    }) as unknown as MediaQueryList) as typeof window.matchMedia;
};

beforeEach(() => setSm(false));
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
  const menuTriggerRef = createRef<HTMLButtonElement>();
  const view = render(
    <EditorHeader
      itinerary={itinerary}
      menuTriggerRef={menuTriggerRef}
      pendingIds={new Set()}
      viewer={viewer}
      {...handlers}
    />,
  );
  return { ...handlers, menuTriggerRef, ...view };
}

const PUBLISHED_LINE = "Thay đổi hiển thị ngay với người xem";

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

it("a draft offers Xuất bản, no published hint and no share action", async () => {
  const user = userEvent.setup();
  const { onRequestPublish } = setup();
  expect(screen.queryByText(PUBLISHED_LINE)).toBeNull();
  expect(screen.queryByText(/Chia s\u1EBB/)).toBeNull();
  await user.click(screen.getByRole("button", { name: "Xuất bản" }));
  expect(onRequestPublish).toHaveBeenCalledTimes(1);
});

it("a published itinerary hides Xuất bản and says edits are visible at once", () => {
  setup({ ...draft, isPublic: true });
  expect(screen.queryByRole("button", { name: "Xuất bản" })).toBeNull();
  expect(screen.getByText(PUBLISHED_LINE)).toBeTruthy();
  expect(screen.queryByText(/Chia s\u1EBB/)).toBeNull();
});

it("the actions menu opens trip info and the delete flow", async () => {
  const user = userEvent.setup();
  const { onOpenTripInfo, onDeleteItinerary } = setup();
  await user.click(screen.getByRole("button", { name: "Thao tác lịch trình" }));
  await user.click(await screen.findByRole("menuitem", { name: "Thông tin chuyến đi" }));
  expect(onOpenTripInfo).toHaveBeenCalledTimes(1);

  await user.click(screen.getByRole("button", { name: "Thao tác lịch trình" }));
  const remove = await screen.findByRole("menuitem", { name: "Xóa lịch trình" });
  expect(remove.getAttribute("data-variant")).toBe("danger");
  await user.click(remove);
  expect(onDeleteItinerary).toHaveBeenCalledTimes(1);
});

it("exposes the menu trigger ref for focus restoration", () => {
  const { menuTriggerRef } = setup();
  expect(menuTriggerRef.current).toBe(screen.getByRole("button", { name: "Thao tác lịch trình" }));
});

it("contains the save indicator and a compact user menu", () => {
  setup();
  expect(screen.getAllByTestId("save-indicator")).toHaveLength(1);
  expect(screen.getAllByTestId("user-menu")).toHaveLength(1);
  expect(screen.getByTestId("user-menu").getAttribute("data-compact")).toBe("true");
});

it("below sm puts save indicator and Xuất bản on a second row", () => {
  setup();
  const row = screen.getByTestId("save-indicator").closest(".border-t");
  expect(row).not.toBeNull();
  expect(row?.contains(screen.getByRole("button", { name: "Xuất bản" }))).toBe(true);
  expect(row?.contains(screen.getByRole("heading", { level: 1 }))).toBe(false);
});

it("from sm keeps everything on a single row", () => {
  setSm(true);
  setup();
  expect(screen.getByTestId("save-indicator").closest(".border-t")).toBeNull();
  expect(screen.getByRole("button", { name: "Xuất bản" }).closest(".border-t")).toBeNull();
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
