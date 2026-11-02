import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { installFakeResizeObserver, type FakeResizeObserverHandle } from "@/test/fake-resize-observer";
import { EditorLayout } from "./editor-layout";

const h = vi.hoisted(() => ({ sheetProps: vi.fn() }));

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

function setup() {
  return render(
    <EditorLayout
      canvas={<div data-testid="canvas">bản đồ hoặc tóm tắt</div>}
      header={<div data-testid="header">header</div>}
      summary={<div data-testid="summary">tóm tắt gọn</div>}
      timeline={<div data-testid="timeline">timeline</div>}
    />,
  );
}

const headerBox = () => screen.getByTestId("header").parentElement as HTMLElement;

it("from lg renders the two-column grid with timeline on the left and the canvas on the right, without a sheet", () => {
  installMatchMedia(true);
  setup();

  const timeline = screen.getByTestId("timeline");
  const canvas = screen.getByTestId("canvas");
  const grid = timeline.closest(".lg\\:grid-cols-\\[var\\(--editor-timeline-width\\)_1fr\\]");
  expect(grid).not.toBeNull();
  expect(grid?.contains(canvas)).toBe(true);
  expect(canvas.parentElement?.className).toContain("p-section");

  const heading = screen.getByRole("heading", { level: 2, name: "Lịch trình theo ngày" });
  expect(heading.className).toContain("sr-only");
  expect(heading.parentElement?.contains(timeline)).toBe(true);
  expect(heading.parentElement?.contains(canvas)).toBe(false);

  expect(screen.queryByTestId("summary")).toBeNull();
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

it("below lg shows the summary behind a non-modal, non-dismissible timeline sheet", async () => {
  installMatchMedia(false);
  setup();

  const summary = screen.getByTestId("summary");
  expect(summary.parentElement?.className).toContain("pb-(--sheet-snap-peek)");
  expect(screen.queryByTestId("canvas")).toBeNull();

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
  expect(screen.getByTestId("canvas")).toBeTruthy();
  expect(screen.queryByTestId("summary")).toBeNull();

  act(() => media.set(false));
  expect(await screen.findByRole("dialog", { name: "Lịch trình theo ngày" })).toBeTruthy();
  expect(screen.getByTestId("summary")).toBeTruthy();
});
