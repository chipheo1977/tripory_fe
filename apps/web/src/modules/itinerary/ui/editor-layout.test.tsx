import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { installFakeResizeObserver, type FakeResizeObserverHandle } from "@/test/fake-resize-observer";
import { EditorLayout, type EditorLayoutProps } from "./editor-layout";
import { snapHeightPx } from "@tripory/ui-web";
import type { MapFrame } from "./editor-map-viewport";
import { TimelinePanel } from "./timeline-panel";

const h = vi.hoisted(() => ({ sheetProps: vi.fn(), frames: [] as unknown[] }));

// Ghi lại props mà EditorLayout truyền cho Sheet, vẫn render Sheet thật.
vi.mock("@tripory/ui-web", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tripory/ui-web")>();
  return {
    ...actual,
    Sheet: (props: Parameters<typeof actual.Sheet>[0]) => {
      h.sheetProps(props);
      return <actual.Sheet {...props} />;
    },
  };
});

const originalMatchMedia = window.matchMedia;

type Listener = () => void;

/** matchMedia giả cho `(min-width: 1024px)`; `set` đổi kết quả và phát `change`. */
function installMatchMedia(wide: boolean) {
  const state = { wide };
  const listeners = new Set<Listener>();
  window.matchMedia = ((query: string) =>
    ({
      get matches() {
        return state.wide && query.includes("1024px");
      },
      media: query,
      addEventListener: (_: string, listener: Listener) => listeners.add(listener),
      removeEventListener: (_: string, listener: Listener) => listeners.delete(listener),
    }) as unknown as MediaQueryList) as typeof window.matchMedia;
  return {
    set(next: boolean) {
      state.wide = next;
      for (const listener of [...listeners]) listener();
    },
  };
}

let ro: FakeResizeObserverHandle;
let disconnects = 0;

beforeEach(() => {
  h.sheetProps.mockClear();
  h.frames.length = 0;
  ro = installFakeResizeObserver();
  disconnects = 0;
  const Fake = (globalThis as { ResizeObserver: new (callback: ResizeObserverCallback) => ResizeObserver }).ResizeObserver;
  class Counting extends Fake {
    override disconnect(): void {
      disconnects += 1;
      super.disconnect();
    }
  }
  (globalThis as { ResizeObserver?: unknown }).ResizeObserver = Counting;
});

afterEach(() => {
  ro.restore();
  window.matchMedia = originalMatchMedia;
});

const renderMap = (frame: MapFrame) => {
  h.frames.push(frame);
  return <div data-testid="map" data-wide={String(frame.wide)}>bản đồ</div>;
};
const lastFrame = () => h.frames.at(-1) as MapFrame;

function setup(props: Partial<EditorLayoutProps> = {}) {
  return render(
    <EditorLayout
      header={<div data-testid="header">header</div>}
      map={renderMap}
      timeline={<div data-testid="timeline">timeline</div>}
      {...props}
    />,
  );
}

const headerBox = () => screen.getByTestId("header").parentElement as HTMLElement;

it("from lg renders the two-column grid with timeline on the left and the map on the right, without a sheet", () => {
  installMatchMedia(true);
  setup();

  const timeline = screen.getByTestId("timeline");
  const canvas = screen.getByTestId("map");
  const grid = timeline.closest(".lg\\:grid-cols-\\[var\\(--editor-timeline-width\\)_1fr\\]");
  expect(grid).not.toBeNull();
  expect(grid?.contains(canvas)).toBe(true);
  expect(canvas.parentElement?.className).not.toContain("p-section");
  expect(canvas.parentElement?.className.split(/\s+/)).toEqual(expect.arrayContaining(["relative", "isolate", "overflow-hidden"]));
  expect(canvas.getAttribute("data-wide")).toBe("true");
  expect(lastFrame().viewport).toEqual({ padding: { top: 64, right: 64, bottom: 64, left: 64 }, coveredBottom: 0 });
  expect(h.frames).toHaveLength(1);

  const heading = screen.getByRole("heading", { level: 2, name: "Lịch trình theo ngày" });
  expect(heading.className).toContain("sr-only");
  expect(heading.parentElement?.contains(timeline)).toBe(true);
  expect(heading.parentElement?.contains(canvas)).toBe(false);

  expect(screen.queryByRole("dialog")).toBeNull();
  expect(screen.queryByRole("button", { name: "Thu gọn bảng" })).toBeNull();
  expect(screen.queryByRole("button", { name: "Đóng" })).toBeNull();
  expect(h.sheetProps).not.toHaveBeenCalled();
});

it("from lg the grid height is the viewport minus the measured header", () => {
  installMatchMedia(true);
  setup();
  act(() => ro.resize(headerBox(), 64));

  const grid = screen.getByTestId("timeline").closest(".lg\\:grid-cols-\\[var\\(--editor-timeline-width\\)_1fr\\]") as HTMLElement;
  expect(grid.style.height).toBe("calc(100dvh - 64px)");
});

it("below lg shows the map as a fixed background behind a non-modal timeline sheet", async () => {
  installMatchMedia(false);
  setup();

  const summary = screen.getByTestId("map");
  expect(summary.getAttribute("data-wide")).toBe("false");
  expect(summary.parentElement?.className.split(/\s+/)).toEqual(expect.arrayContaining(["fixed", "inset-x-0", "bottom-0"]));

  const sheet = await screen.findByRole("dialog", { name: "Lịch trình theo ngày" });
  expect(within(sheet).getByTestId("timeline")).toBeTruthy();
  expect(summary.closest("[role=dialog]")).toBeNull();
  // Sheet timeline non-modal vẫn có nút X "Đóng" (như vuốt xuống hết); mở lại bằng chip "Lịch trình".
  for (const name of ["Thu gọn bảng", "Mở rộng bảng", "Đóng bảng"]) {
    expect(screen.queryByRole("button", { name })).toBeNull();
  }
  expect(within(sheet).getByRole("button", { name: "Đóng" })).toBeTruthy();
  expect(document.querySelector("[data-sheet-backdrop]")).toBeNull();

  const props = h.sheetProps.mock.calls.at(-1)?.[0] as Record<string, unknown>;
  expect(props).toMatchObject({ open: true, modal: false, defaultSnap: "medium" });
  // Đóng được (vuốt xuống hết từ peek), nên không được khóa `dismissible`.
  expect(props.dismissible).not.toBe(false);
  // Chiều cao cố định bằng mức expanded: nếu mất thì nội dung ngắn làm Base UI gộp mất mức giữa.
  expect(sheet.style.height).toMatch(/px$/);
  expect(screen.queryByRole("button", { name: "Lịch trình" })).toBeNull();
});

it("below lg the sheet popup has no bottom padding and does not scroll itself (the timeline body is the only scroller)", async () => {
  installMatchMedia(false);
  setup();

  const sheet = await screen.findByRole("dialog", { name: "Lịch trình theo ngày" });
  const classes = sheet.className.split(/\s+/);
  expect(classes).toContain("pb-0");
  expect(classes.some((name) => name.startsWith("pb-[calc("))).toBe(false);
  expect(classes).toContain("overflow-y-hidden");
  expect(classes).not.toContain("overflow-y-auto");
});

const scrollerOf = () => document.querySelector<HTMLElement>("[data-timeline-scroller]");
const panel = (
  <TimelinePanel tabs={<div role="tablist">tab</div>}>
    <p>nội dung</p>
  </TimelinePanel>
);

it("below lg a TimelinePanel scrolls only its body: the scroller ends at the visible bottom and scrolls at medium, not at peek", async () => {
  installMatchMedia(false);
  const { rerender } = setup({ timeline: panel });
  await screen.findByRole("dialog", { name: "Lịch trình theo ngày" });

  // Mức vừa (mặc định): thân cuộn được, đáy vùng cuộn nâng lên đúng phần đáy popup bị che.
  expect(scrollerOf()?.className.split(/\s+/)).toContain("overflow-y-auto");
  expect(scrollerOf()?.style.bottom).toMatch(/^\d+(\.\d+)?px$/);
  expect(scrollerOf()?.style.bottom).not.toBe("0px");

  rerender(
    <EditorLayout
      header={<div data-testid="header">header</div>}
      map={renderMap}
      sheetSnapRequest={{ seq: 1, snap: "expanded" }}
      timeline={panel}
    />,
  );
  await waitFor(() => expect(scrollerOf()?.style.bottom).toBe("0px"));
  expect(scrollerOf()?.className.split(/\s+/)).toContain("overflow-y-auto");

  rerender(
    <EditorLayout
      header={<div data-testid="header">header</div>}
      map={renderMap}
      sheetSnapRequest={{ seq: 2, snap: "peek" }}
      timeline={panel}
    />,
  );
  await waitFor(() => expect(scrollerOf()?.className.split(/\s+/)).toContain("overflow-y-hidden"));
});

it("from lg a TimelinePanel has no sheet scroller (the left column scrolls and the tab strip is sticky)", () => {
  installMatchMedia(true);
  setup({ timeline: panel });

  expect(scrollerOf()).toBeNull();
  expect(screen.getByRole("tablist").parentElement?.className.split(/\s+/)).toEqual(expect.arrayContaining(["sticky", "top-0"]));
});
it("closing the timeline sheet shows a chip that reopens it", async () => {
  installMatchMedia(false);
  setup();
  await screen.findByRole("dialog", { name: "Lịch trình theo ngày" });

  // Vuốt xuống hết gọi onOpenChange(false) giống Esc; jsdom không có cử chỉ thật.
  await userEvent.keyboard("{Escape}");
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  const chip = screen.getByRole("button", { name: "Lịch trình" });

  await userEvent.click(chip);
  expect(await screen.findByRole("dialog", { name: "Lịch trình theo ngày" })).toBeTruthy();
  expect(screen.queryByRole("button", { name: "Lịch trình" })).toBeNull();
  expect((h.sheetProps.mock.calls.at(-1)?.[0] as { defaultSnap: string }).defaultSnap).toBe("medium");
});

it("the X button closes the timeline sheet, shows the chip, and the chip reopens it", async () => {
  installMatchMedia(false);
  setup();
  const sheet = await screen.findByRole("dialog", { name: "Lịch trình theo ngày" });

  await userEvent.click(within(sheet).getByRole("button", { name: "Đóng" }));
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  expect((h.sheetProps.mock.calls.at(-1)?.[0] as { open: boolean }).open).toBe(false);
  const chip = screen.getByRole("button", { name: "Lịch trình" });

  await userEvent.click(chip);
  const reopened = await screen.findByRole("dialog", { name: "Lịch trình theo ngày" });
  expect(within(reopened).getByRole("button", { name: "Đóng" })).toBeTruthy();
  expect(screen.queryByRole("button", { name: "Lịch trình" })).toBeNull();
});

it("passes the measured header height to the sheet as insetTop", () => {
  installMatchMedia(false);
  setup();
  expect((h.sheetProps.mock.calls.at(-1)?.[0] as { insetTop: number }).insetTop).toBe(0);

  act(() => ro.resize(headerBox(), 108));
  expect((h.sheetProps.mock.calls.at(-1)?.[0] as { insetTop: number }).insetTop).toBe(108);

  act(() => ro.resize(headerBox(), 64));
  expect((h.sheetProps.mock.calls.at(-1)?.[0] as { insetTop: number }).insetTop).toBe(64);
});

it("disconnects the resize observer on unmount", () => {
  installMatchMedia(false);
  const { unmount } = setup();
  expect(disconnects).toBe(0);
  unmount();
  expect(disconnects).toBeGreaterThanOrEqual(1);
});

it("swaps between the grid and the sheet when the viewport crosses lg", async () => {
  const media = installMatchMedia(false);
  setup();
  await screen.findByRole("dialog", { name: "Lịch trình theo ngày" });

  act(() => media.set(true));
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(screen.getByTestId("map").getAttribute("data-wide")).toBe("true");
  expect(screen.getByTestId("map")).toBeTruthy();

  act(() => media.set(false));
  expect(await screen.findByRole("dialog", { name: "Lịch trình theo ngày" })).toBeTruthy();
  expect(screen.getByTestId("map").getAttribute("data-wide")).toBe("false");
});

it("below lg the map top follows the measured header and the viewport follows the sheet snap (medium by default)", () => {
  installMatchMedia(false);
  Object.defineProperty(window, "innerHeight", { configurable: true, value: 844 });
  setup();
  act(() => ro.resize(headerBox(), 64));

  const background = screen.getByTestId("map").parentElement as HTMLElement;
  expect(background.style.top).toBe("64px");
  const covered = snapHeightPx(844, 64, "medium");
  expect(lastFrame().viewport).toEqual({
    padding: { top: 64, left: 32, right: 32, bottom: covered + 32 },
    coveredBottom: covered,
  });
  expect((h.sheetProps.mock.calls.at(-1)?.[0] as { snap: string }).snap).toBe("medium");
});

it("reports a new viewport when the sheet snap changes", () => {
  installMatchMedia(false);
  Object.defineProperty(window, "innerHeight", { configurable: true, value: 844 });
  setup();
  act(() => ro.resize(headerBox(), 64));

  act(() => (h.sheetProps.mock.calls.at(-1)?.[0] as { onSnapChange(snap: string): void }).onSnapChange("peek"));

  expect(lastFrame().viewport.coveredBottom).toBe(snapHeightPx(844, 64, "peek"));
  expect((h.sheetProps.mock.calls.at(-1)?.[0] as { snap: string }).snap).toBe("peek");
});

it("closing the sheet makes the viewport reserve the reopen chip area", async () => {
  installMatchMedia(false);
  setup();
  const sheet = await screen.findByRole("dialog", { name: "Lịch trình theo ngày" });

  await userEvent.click(within(sheet).getByRole("button", { name: "Đóng" }));
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());

  expect(lastFrame().viewport.coveredBottom).toBe(76);
  expect(lastFrame().viewport.padding.bottom).toBe(108);
});

it("a sheet snap request moves the sheet to that snap, and reopens it when closed; the same seq is not re-applied", async () => {
  installMatchMedia(false);
  const view = setup();
  const sheet = await screen.findByRole("dialog", { name: "Lịch trình theo ngày" });
  act(() => (h.sheetProps.mock.calls.at(-1)?.[0] as { onSnapChange(snap: string): void }).onSnapChange("peek"));
  expect((h.sheetProps.mock.calls.at(-1)?.[0] as { snap: string }).snap).toBe("peek");

  const request = (seq: number) => ({ seq, snap: "medium" as const });
  const rerenderWith = (seq: number) =>
    view.rerender(
      <EditorLayout
        header={<div data-testid="header">header</div>}
        map={renderMap}
        sheetSnapRequest={request(seq)}
        timeline={<div data-testid="timeline">timeline</div>}
      />,
    );
  rerenderWith(1);
  expect((h.sheetProps.mock.calls.at(-1)?.[0] as { snap: string }).snap).toBe("medium");

  // Cùng seq: không áp lại dù người dùng đã kéo sheet xuống mức khác.
  act(() => (h.sheetProps.mock.calls.at(-1)?.[0] as { onSnapChange(snap: string): void }).onSnapChange("expanded"));
  rerenderWith(1);
  expect((h.sheetProps.mock.calls.at(-1)?.[0] as { snap: string }).snap).toBe("expanded");

  // Đóng sheet rồi yêu cầu mới: mở lại ở mức vừa.
  await userEvent.click(within(sheet).getByRole("button", { name: "Đóng" }));
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  rerenderWith(2);
  expect(await screen.findByRole("dialog", { name: "Lịch trình theo ngày" })).toBeTruthy();
  expect((h.sheetProps.mock.calls.at(-1)?.[0] as { snap: string; open: boolean })).toMatchObject({ snap: "medium", open: true });
});

it("reopening with the chip goes back to the medium snap", async () => {
  installMatchMedia(false);
  setup();
  const sheet = await screen.findByRole("dialog", { name: "Lịch trình theo ngày" });
  act(() => (h.sheetProps.mock.calls.at(-1)?.[0] as { onSnapChange(snap: string): void }).onSnapChange("expanded"));

  await userEvent.click(within(sheet).getByRole("button", { name: "Đóng" }));
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  await userEvent.click(screen.getByRole("button", { name: "Lịch trình" }));

  expect((h.sheetProps.mock.calls.at(-1)?.[0] as { snap: string }).snap).toBe("medium");
});
