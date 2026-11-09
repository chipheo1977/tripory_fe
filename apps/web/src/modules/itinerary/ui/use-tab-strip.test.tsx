import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DRAG_THRESHOLD_PX, stripEdgesOf, useTabStrip } from "./use-tab-strip";

describe("stripEdgesOf", () => {
  it.each([
    [{ scrollLeft: 0, clientWidth: 300, scrollWidth: 300 }, { start: false, end: false }],
    [{ scrollLeft: 0, clientWidth: 300, scrollWidth: 700 }, { start: false, end: true }],
    [{ scrollLeft: 200, clientWidth: 300, scrollWidth: 700 }, { start: true, end: true }],
    [{ scrollLeft: 400, clientWidth: 300, scrollWidth: 700 }, { start: true, end: false }],
    // Sai số làm tròn dưới 1px không tính là còn bị cắt.
    [{ scrollLeft: 0.5, clientWidth: 300, scrollWidth: 300.5 }, { start: false, end: false }],
  ])("%j -> %j", (metrics, expected) => {
    expect(stripEdgesOf(metrics)).toEqual(expected);
  });
});

function Strip({ onTabClick, tabRef }: { onTabClick(): void; tabRef?: { current: HTMLElement | null } }) {
  const { stripProps, edges, scrollTabIntoView } = useTabStrip();
  return (
    <div data-testid="strip" {...stripProps}>
      <button
        onClick={onTabClick}
        ref={(element) => {
          if (tabRef !== undefined) tabRef.current = element;
        }}
        role="tab"
        type="button"
      >
        Ngày 1
      </button>
      <button onClick={() => tabRef?.current && scrollTabIntoView(tabRef.current)} type="button">
        cuộn
      </button>
      <output data-testid="edges">{`${edges.start}/${edges.end}`}</output>
    </div>
  );
}

// jsdom không có bố cục: giả `scrollLeft` (đọc/ghi) và kích thước để kiểm logic kéo và mép.
function stub(strip: HTMLElement, sizes: { scrollLeft?: number; clientWidth?: number; scrollWidth?: number } = {}) {
  const state = { scrollLeft: sizes.scrollLeft ?? 0 };
  Object.defineProperty(strip, "scrollLeft", { configurable: true, get: () => state.scrollLeft, set: (value: number) => (state.scrollLeft = value) });
  Object.defineProperty(strip, "clientWidth", { configurable: true, value: sizes.clientWidth ?? 300 });
  Object.defineProperty(strip, "scrollWidth", { configurable: true, value: sizes.scrollWidth ?? 700 });
  return state;
}

const mouse = (clientX: number, extra: Record<string, unknown> = {}) => ({ pointerType: "mouse", pointerId: 1, button: 0, clientX, ...extra });

beforeEach(() => {
  HTMLElement.prototype.setPointerCapture = vi.fn();
  HTMLElement.prototype.releasePointerCapture = vi.fn();
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

describe("kéo bằng chuột", () => {
  it("kéo quá ngưỡng thì cuộn ngược chiều con trỏ", () => {
    render(<Strip onTabClick={vi.fn()} />);
    const strip = screen.getByTestId("strip");
    const state = stub(strip, { scrollLeft: 100 });

    fireEvent.pointerDown(strip, mouse(200));
    fireEvent.pointerMove(strip, mouse(150));

    expect(state.scrollLeft).toBe(150);
    expect(HTMLElement.prototype.setPointerCapture).toHaveBeenCalledTimes(1);
  });

  it("di chuyển dưới ngưỡng không cuộn và không bắt con trỏ", () => {
    render(<Strip onTabClick={vi.fn()} />);
    const strip = screen.getByTestId("strip");
    const state = stub(strip, { scrollLeft: 100 });

    fireEvent.pointerDown(strip, mouse(200));
    fireEvent.pointerMove(strip, mouse(200 - (DRAG_THRESHOLD_PX - 1)));

    expect(state.scrollLeft).toBe(100);
    expect(HTMLElement.prototype.setPointerCapture).not.toHaveBeenCalled();
  });

  it("chạm/bút (không phải chuột) và nút phải không kích hoạt kéo", () => {
    render(<Strip onTabClick={vi.fn()} />);
    const strip = screen.getByTestId("strip");
    const state = stub(strip, { scrollLeft: 100 });

    fireEvent.pointerDown(strip, mouse(200, { pointerType: "touch" }));
    fireEvent.pointerMove(strip, mouse(100, { pointerType: "touch" }));
    fireEvent.pointerUp(strip, mouse(100, { pointerType: "touch" }));
    fireEvent.pointerDown(strip, mouse(200, { button: 2 }));
    fireEvent.pointerMove(strip, mouse(100));

    expect(state.scrollLeft).toBe(100);
  });

  it("bỏ click ngay sau khi kéo, rồi click lại bình thường", () => {
    const onTabClick = vi.fn();
    render(<Strip onTabClick={onTabClick} />);
    const strip = screen.getByTestId("strip");
    stub(strip);
    const tab = screen.getByRole("tab", { name: "Ngày 1" });

    fireEvent.pointerDown(tab, mouse(200));
    fireEvent.pointerMove(strip, mouse(120));
    fireEvent.pointerUp(strip, mouse(120));
    fireEvent.click(tab);
    expect(onTabClick).not.toHaveBeenCalled();

    act(() => vi.runAllTimers());
    fireEvent.click(tab);
    expect(onTabClick).toHaveBeenCalledTimes(1);
  });

  it("nhấp không kéo vẫn chọn tab", () => {
    const onTabClick = vi.fn();
    render(<Strip onTabClick={onTabClick} />);
    const tab = screen.getByRole("tab", { name: "Ngày 1" });
    stub(screen.getByTestId("strip"));

    fireEvent.pointerDown(tab, mouse(200));
    fireEvent.pointerUp(tab, mouse(200));
    fireEvent.click(tab);

    expect(onTabClick).toHaveBeenCalledTimes(1);
  });
});

describe("nhấn chuột trên tab", () => {
  it("chặn focus mặc định của mousedown trên tab (để kéo không chọn tab), không chặn chỗ khác", () => {
    render(<Strip onTabClick={vi.fn()} />);
    stub(screen.getByTestId("strip"));

    expect(fireEvent.mouseDown(screen.getByRole("tab", { name: "Ngày 1" }), { button: 0 })).toBe(false);
    expect(fireEvent.mouseDown(screen.getByTestId("edges"), { button: 0 })).toBe(true);
    expect(fireEvent.mouseDown(screen.getByRole("tab", { name: "Ngày 1" }), { button: 2 })).toBe(true);
  });

  it("nhấp không kéo thì focus vào tab; kéo thì không", () => {
    render(<Strip onTabClick={vi.fn()} />);
    const tab = screen.getByRole("tab", { name: "Ngày 1" });
    stub(screen.getByTestId("strip"));

    fireEvent.pointerDown(tab, mouse(200));
    fireEvent.pointerUp(tab, mouse(200));
    expect(document.activeElement).toBe(tab);

    tab.blur();
    fireEvent.pointerDown(tab, mouse(200));
    fireEvent.pointerMove(screen.getByTestId("strip"), mouse(100));
    fireEvent.pointerUp(screen.getByTestId("strip"), mouse(100));
    expect(document.activeElement).not.toBe(tab);
  });
});

describe("mép bị cắt", () => {
  it("cập nhật khi cuộn", () => {
    render(<Strip onTabClick={vi.fn()} />);
    const strip = screen.getByTestId("strip");
    const state = stub(strip, { scrollLeft: 0, clientWidth: 300, scrollWidth: 700 });

    fireEvent.scroll(strip);
    expect(screen.getByTestId("edges").textContent).toBe("false/true");

    state.scrollLeft = 200;
    fireEvent.scroll(strip);
    expect(screen.getByTestId("edges").textContent).toBe("true/true");

    state.scrollLeft = 400;
    fireEvent.scroll(strip);
    expect(screen.getByTestId("edges").textContent).toBe("true/false");
  });
});

describe("scrollTabIntoView", () => {
  const original = window.matchMedia;
  const scrollIntoView = vi.fn();

  afterEach(() => {
    window.matchMedia = original;
  });

  it.each([
    [false, "smooth"],
    [true, "auto"],
  ] as const)("giảm chuyển động=%s -> behavior %s", (reduced, behavior) => {
    Element.prototype.scrollIntoView = scrollIntoView;
    scrollIntoView.mockClear();
    window.matchMedia = ((query: string) =>
      ({ matches: reduced && query.includes("prefers-reduced-motion"), media: query }) as unknown as MediaQueryList) as typeof window.matchMedia;
    const tabRef = { current: null as HTMLElement | null };
    render(<Strip onTabClick={vi.fn()} tabRef={tabRef} />);

    fireEvent.click(screen.getByRole("button", { name: "cuộn" }));

    expect(scrollIntoView).toHaveBeenCalledWith({ inline: "nearest", block: "nearest", behavior });
  });
});
