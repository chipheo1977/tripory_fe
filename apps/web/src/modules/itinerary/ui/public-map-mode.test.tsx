import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useEffect } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FX_AUTHOR, makeFxItinerary } from "@/test/domain-itinerary-fixtures";
import type { MapStatus } from "./map/trip-map";
import { PublicMapMode, type PublicMapModeProps } from "./public-map-mode";

const h = vi.hoisted(() => ({ props: null as Record<string, unknown> | null }));

// Thay bản đồ thật (cần WebGL) bằng bản giả: lưu props cuối và báo "loading" lúc mount.
vi.mock("./map/trip-map.lazy", () => ({
  LazyTripMap: function FakeTripMap(props: Record<string, unknown> & { onStatusChange(status: string): void }) {
    h.props = props;
    useEffect(() => {
      props.onStatusChange("loading");
    }, []); // eslint-disable-line react-hooks/exhaustive-deps -- chỉ báo một lần lúc mount, giống TripMap thật
    return <div data-testid="fake-trip-map" />;
  },
}));

const originalMatchMedia = window.matchMedia;
const originalScrollIntoView = Element.prototype.scrollIntoView;

function installMatchMedia(wide: boolean) {
  window.matchMedia = ((query: string) =>
    ({
      matches: wide && query.includes("min-width"),
      media: query,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    }) as unknown as MediaQueryList) as typeof window.matchMedia;
}

const report = (status: MapStatus) => act(() => (h.props?.onStatusChange as (s: MapStatus) => void)(status));
const camera = () => h.props?.camera as { seq: number; kind: string };
const pinSelect = (id: string) => act(() => (h.props?.onPinSelect as (id: string) => void)(id));

beforeEach(() => {
  h.props = null;
  Element.prototype.scrollIntoView = vi.fn();
});

afterEach(() => {
  window.matchMedia = originalMatchMedia;
  Element.prototype.scrollIntoView = originalScrollIntoView;
});

function setup(overrides: Partial<PublicMapModeProps> = {}, wide = true) {
  installMatchMedia(wide);
  const onViewChange = vi.fn();
  const onViewArticle = vi.fn();
  const view = render(
    <PublicMapMode
      headerHeight={64}
      isOwner={false}
      itinerary={makeFxItinerary()}
      onViewArticle={onViewArticle}
      onViewChange={onViewChange}
      view="map"
      {...overrides}
    />,
  );
  return { ...view, onViewChange, onViewArticle, user: userEvent.setup() };
}

const pills = () => screen.queryAllByRole("group", { name: "Chế độ xem" });

describe("PublicMapMode wide", () => {
  it("has the main landmark, a screen-reader title, the tabs and the map", () => {
    const { container } = setup();

    const main = container.querySelector("main#map-content") as HTMLElement;
    expect(main).not.toBeNull();
    expect(within(main).getByRole("heading", { level: 1, name: "Sài Gòn 3 ngày" }).className).toContain("sr-only");
    const labels = screen.getAllByRole("tab").map((tab) => tab.getAttribute("aria-label"));
    expect(labels).toEqual(["Tổng quan", "Ngày 1", "Ngày 2", "Ngày 3"]);
    expect(screen.getByRole("tab", { name: "Tổng quan" }).getAttribute("aria-selected")).toBe("true");
    expect(screen.getByRole("region", { name: "Bản đồ lịch trình" })).toBeTruthy();
    expect(screen.getByTestId("fake-trip-map")).toBeTruthy();
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("does not render the mode pill here (it lives on the header from lg)", () => {
    setup();

    expect(pills()).toHaveLength(0);
  });

  it("shows the author in the overview", () => {
    setup({ itinerary: makeFxItinerary({ author: FX_AUTHOR }) });

    expect(screen.getByText("Trần Thị Lan")).toBeTruthy();
  });

  it("opens a day from its overview row, selects and focuses the tab and refits the map", async () => {
    const { user } = setup();
    report("ready");
    const before = camera().seq;

    await user.click(screen.getByRole("button", { name: /^Xem Ngày 3/ }));

    expect(screen.getByRole("tab", { name: "Ngày 3" }).getAttribute("aria-selected")).toBe("true");
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole("tab", { name: "Ngày 3" })));
    expect(screen.getByRole("list", { name: "Điểm đến Ngày 3" })).toBeTruthy();
    expect(camera().kind).toBe("fit");
    expect(camera().seq).toBeGreaterThan(before);
  });

  it("selects a waypoint from the list and moves the map to it once the map is ready", async () => {
    const { user } = setup();
    await user.click(screen.getByRole("tab", { name: "Ngày 1" }));
    const startSeq = camera().seq;

    await user.click(screen.getAllByRole("button", { name: /Điểm w-1-0/ })[0]!);
    expect(camera().seq).toBe(startSeq);
    expect(screen.getByRole("link", { name: /Mở Điểm w-1-0 trong Google Maps/ })).toBeTruthy();

    report("ready");
    await user.click(screen.getAllByRole("button", { name: /Điểm w-1-1/ })[0]!);

    expect(camera().kind).toBe("focus");
    expect(screen.getAllByRole("button", { name: /Điểm w-1-1/ })[0]!.getAttribute("aria-current")).toBe("true");
  });

  it("selects the matching list item when a map pin is pressed and clears it on a background click", async () => {
    const { user } = setup();
    await user.click(screen.getByRole("tab", { name: "Ngày 1" }));

    pinSelect("w-1-1");
    expect(screen.getAllByRole("button", { name: /Điểm w-1-1/ })[0]!.getAttribute("aria-current")).toBe("true");
    expect(camera().kind).toBe("reveal");

    act(() => (h.props?.onBackgroundClick as () => void)());
    expect(screen.getAllByRole("button", { name: /Điểm w-1-1/ })[0]!.getAttribute("aria-current")).toBeNull();
  });

  it("has no editing, adding, deleting or dragging control anywhere", () => {
    const { container } = setup();

    for (const pattern of [/thêm/i, /sửa/i, /xóa/i, /kéo/i]) {
      expect(screen.queryByRole("button", { name: pattern })).toBeNull();
    }
    expect(container.querySelector("[aria-roledescription]")).toBeNull();
    expect(container.querySelector("input, textarea")).toBeNull();
  });

  it("explains a failed map with the article fallback and no editor summary", async () => {
    const { user, onViewArticle } = setup();

    report("error");

    expect(screen.getByText("Không tải được bản đồ")).toBeTruthy();
    expect(screen.getByText("Bạn vẫn xem được lịch trình dạng bài viết.")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Thử tải lại bản đồ" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Sửa thông tin" })).toBeNull();
    await user.click(screen.getByRole("button", { name: "Xem dạng bài viết" }));
    expect(onViewArticle).toHaveBeenCalledTimes(1);
  });

  it("shows the empty chip when the itinerary has no waypoint", () => {
    setup({ itinerary: makeFxItinerary({ days: [], waypoints: [] }) });

    report("ready");

    expect(screen.getByText("Lịch trình chưa có điểm đến nào")).toBeTruthy();
  });
});

describe("PublicMapMode narrow", () => {
  it("opens the sheet with exactly one pill, inside the sheet's sticky bar", async () => {
    setup({}, false);

    const sheet = await screen.findByRole("dialog", { name: "Lịch trình theo ngày" });
    expect(pills()).toHaveLength(1);
    expect(sheet.contains(pills()[0] as HTMLElement)).toBe(true);
    expect((pills()[0] as HTMLElement).closest(".sticky")).not.toBeNull();
  });

  it("moves the pill next to the reopen chip when the sheet is closed, and back when it is reopened", async () => {
    const { user } = setup({}, false);
    const sheet = await screen.findByRole("dialog", { name: "Lịch trình theo ngày" });

    await user.click(within(sheet).getByRole("button", { name: "Đóng" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());

    const chip = screen.getByRole("button", { name: "Lịch trình" });
    expect(pills()).toHaveLength(1);
    expect(chip.parentElement?.contains(pills()[0] as HTMLElement)).toBe(true);

    await user.click(chip);
    const reopened = await screen.findByRole("dialog", { name: "Lịch trình theo ngày" });
    expect(pills()).toHaveLength(1);
    expect(reopened.contains(pills()[0] as HTMLElement)).toBe(true);
  });

  it("reports the picked mode from the pill", async () => {
    const { user, onViewChange } = setup({ view: "map" }, false);
    await screen.findByRole("dialog", { name: "Lịch trình theo ngày" });

    await user.click(within(pills()[0] as HTMLElement).getByRole("button", { name: "Bài viết" }));

    expect(onViewChange).toHaveBeenCalledWith("article");
  });

  it("reopens the sheet at the medium snap when a pin is pressed while it is closed", async () => {
    const { user } = setup({}, false);
    const sheet = await screen.findByRole("dialog", { name: "Lịch trình theo ngày" });
    await user.click(within(sheet).getByRole("button", { name: "Đóng" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());

    pinSelect("w-1-0");

    expect(await screen.findByRole("dialog", { name: "Lịch trình theo ngày" })).toBeTruthy();
  });
});
