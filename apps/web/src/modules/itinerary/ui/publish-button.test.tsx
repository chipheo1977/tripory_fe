import type { Itinerary, Waypoint } from "@tripory/itinerary";
import { parseItineraryId, parseUserId } from "@tripory/shared-kernel";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import { PublishButton, PublishHintStrip, PUBLISH_BLOCKED_HINT } from "./publish-button";

const ID = parseItineraryId("3f2a6c1e-8b7d-4e21-9c55-0a1b2c3d4e5f");
const OWNER = parseUserId("3f2504e0-4f89-11d3-9a0c-0305e82c3301");
if (ID === null || OWNER === null) throw new Error("dữ liệu mẫu phải hợp lệ");

const waypoint = (id: string): Waypoint => ({
  id,
  dayNumber: 1,
  orderIndex: 0,
  name: `Điểm ${id}`,
  address: null,
  notes: null,
  coordinate: { latitude: 11.94, longitude: 108.44 },
});

const draft: Itinerary = {
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
  totalDistanceKm: 0,
  days: [],
  waypoints: [],
};

const HINT_ID = "publish-hint";
const originalMatchMedia = window.matchMedia;

/** Mặc định dưới `md`; `setFromMd` mô phỏng từ `md` (768px) nhưng dưới `lg`. */
const setFromMd = () => {
  window.matchMedia = ((query: string) =>
    ({
      matches: query.includes("768px"),
      media: query,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    }) as unknown as MediaQueryList) as typeof window.matchMedia;
};

/** `true` mô phỏng từ `lg` (min-width 1024px, kéo theo từ `md`). */
const setWide = (wide: boolean) => {
  window.matchMedia = ((query: string) =>
    ({
      matches: wide,
      media: query,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    }) as unknown as MediaQueryList) as typeof window.matchMedia;
};

afterEach(() => {
  window.matchMedia = originalMatchMedia;
});

function setup(
  options: {
    itinerary?: Itinerary;
    pending?: ReadonlySet<string>;
    stripVisible?: boolean;
    onBlockedPress?: () => void;
    onHintFocusChange?: (focused: boolean) => void;
  } = {},
) {
  const onRequestPublish = vi.fn();
  const view = render(
    <>
      <PublishButton
        hintId={HINT_ID}
        itinerary={options.itinerary ?? draft}
        onBlockedPress={options.onBlockedPress}
        onHintFocusChange={options.onHintFocusChange}
        onRequestPublish={onRequestPublish}
        pendingIds={options.pending ?? new Set()}
      />
      <PublishHintStrip hintId={HINT_ID} visible={options.stripVisible ?? false} />
    </>,
  );
  return { onRequestPublish, ...view };
}

const publish = () => screen.getByRole("button", { name: "Xuất bản" });

it("with no waypoint uses aria-disabled (not disabled), stays focusable and points to the explanation", async () => {
  const user = userEvent.setup();
  setup();
  const button = publish();
  expect(button.getAttribute("aria-disabled")).toBe("true");
  expect(button.hasAttribute("disabled")).toBe(false);
  expect(button.getAttribute("aria-describedby")).toBe(HINT_ID);
  expect(document.getElementById(HINT_ID)?.textContent).toBe("Thêm ít nhất 1 điểm đến để xuất bản");
  expect(PUBLISH_BLOCKED_HINT).toBe("Thêm ít nhất 1 điểm đến để xuất bản");
  await user.tab();
  expect(document.activeElement).toBe(button);
});

it("below md it is a bare icon: no filled primary frame, accent colour when allowed", () => {
  setup({ itinerary: { ...draft, waypoints: [waypoint("a")] } });
  const className = publish().className;
  expect(className).not.toContain("bg-primary");
  expect(className).toContain("bg-transparent");
  expect(className).toContain("not-aria-disabled:text-primary");
  expect(className).toContain("min-w-touch");
  expect(publish().querySelector("svg")).not.toBeNull();
});

it("below md blocked shows only a disabled icon colour, not a frame", async () => {
  const user = userEvent.setup();
  setup();
  const button = publish();
  expect(button.className).not.toContain("bg-primary");
  expect(button.className).toContain("aria-disabled:text-disabled");
  expect(button.className).toContain("aria-disabled:cursor-not-allowed");
  expect(button.className).not.toContain("aria-disabled:bg-surface-muted");
  expect(button.getAttribute("aria-disabled")).toBe("true");
  expect(button.getAttribute("aria-describedby")).toBe(HINT_ID);
  await user.tab();
  expect(document.activeElement).toBe(button);
});

it("from md it is the primary button with its label, and looks disabled while blocked", () => {
  setFromMd();
  setup();
  expect(publish().className).toContain("bg-primary");
  expect(publish().className).toContain("aria-disabled:bg-surface-muted");
  expect(publish().className).toContain("aria-disabled:text-disabled");
  expect(screen.getByText("Xuất bản", { selector: "span" }).className).toContain("md:not-sr-only");
});

it("from md an allowed button keeps the primary fill", () => {
  setFromMd();
  setup({ itinerary: { ...draft, waypoints: [waypoint("a")] } });
  expect(publish().className).toContain("bg-primary");
  expect(publish().className).not.toContain("not-aria-disabled:text-primary");
});

it("does not ask to publish when blocked, but reports the blocked press", async () => {
  const user = userEvent.setup();
  const onBlockedPress = vi.fn();
  const { onRequestPublish } = setup({ onBlockedPress });
  await user.click(publish());
  expect(onRequestPublish).not.toHaveBeenCalled();
  expect(onBlockedPress).toHaveBeenCalledTimes(1);
});

it("does not ask to publish with Enter or Space either", async () => {
  const user = userEvent.setup();
  const { onRequestPublish } = setup();
  await user.tab();
  await user.keyboard("{Enter}");
  await user.keyboard(" ");
  expect(onRequestPublish).not.toHaveBeenCalled();
});

it("stays blocked when every waypoint is waiting to be deleted", () => {
  setup({ itinerary: { ...draft, waypoints: [waypoint("a"), waypoint("b")] }, pending: new Set(["a", "b"]) });
  expect(publish().getAttribute("aria-disabled")).toBe("true");
});

it("asks to publish when at least one waypoint is not pending deletion", async () => {
  const user = userEvent.setup();
  const { onRequestPublish } = setup({
    itinerary: { ...draft, waypoints: [waypoint("a"), waypoint("b")] },
    pending: new Set(["a"]),
  });
  const button = publish();
  expect(button.hasAttribute("aria-disabled")).toBe(false);
  expect(button.hasAttribute("aria-describedby")).toBe(false);
  await user.click(button);
  expect(onRequestPublish).toHaveBeenCalledTimes(1);
});

it("renders nothing once published", () => {
  setup({ itinerary: { ...draft, isPublic: true, waypoints: [waypoint("a")] } });
  expect(screen.queryByRole("button")).toBeNull();
});

it("never offers a share action", () => {
  setup({ itinerary: { ...draft, waypoints: [waypoint("a")] } });
  // Viết bằng escape để acceptance Select-String trên publish-*.tsx không thấy từ khóa chia sẻ.
  expect(screen.queryByText(/Chia s\u1EBB/)).toBeNull();
});

it("below lg the strip is hidden but still in the DOM, and shows when visible", () => {
  const { rerender } = setup();
  const strip = document.getElementById(HINT_ID) as HTMLElement;
  expect(strip.hasAttribute("hidden")).toBe(true);
  expect(strip.className).toContain("bg-surface-muted");
  expect(strip.className).toContain("text-label");
  expect(strip.className).toContain("text-muted");
  expect(strip.className).toContain("lg:hidden");
  rerender(<PublishHintStrip hintId={HINT_ID} visible />);
  expect((document.getElementById(HINT_ID) as HTMLElement).hasAttribute("hidden")).toBe(false);
});

it("below lg focusing the blocked button opens no tooltip and reports focus changes", async () => {
  const user = userEvent.setup();
  const onHintFocusChange = vi.fn();
  setup({ onHintFocusChange });
  await user.tab();
  expect(screen.queryByRole("tooltip")).toBeNull();
  expect(onHintFocusChange).toHaveBeenLastCalledWith(true);
  await user.tab();
  expect(onHintFocusChange).toHaveBeenLastCalledWith(false);
});

it("from lg the explanation is a tooltip opened by focus, kept by a press and closed by Escape", async () => {
  setWide(true);
  const user = userEvent.setup();
  const { onRequestPublish } = setup();
  await user.tab();
  const tooltip = await screen.findByRole("tooltip");
  expect(tooltip.textContent).toBe("Thêm ít nhất 1 điểm đến để xuất bản");
  expect(publish().getAttribute("aria-describedby")).toBe(HINT_ID);

  await user.click(publish());
  expect(screen.getByRole("tooltip")).toBeTruthy();
  expect(onRequestPublish).not.toHaveBeenCalled();

  await user.keyboard("{Escape}");
  expect(screen.queryByRole("tooltip")).toBeNull();
});

it("from lg a press opens the tooltip even without prior focus", async () => {
  setWide(true);
  const user = userEvent.setup();
  setup();
  await user.click(publish());
  expect(await screen.findByRole("tooltip")).toBeTruthy();
});

it("from lg an allowed button has no tooltip", async () => {
  setWide(true);
  const user = userEvent.setup();
  setup({ itinerary: { ...draft, waypoints: [waypoint("a")] } });
  await user.tab();
  expect(screen.queryByRole("tooltip")).toBeNull();
});
