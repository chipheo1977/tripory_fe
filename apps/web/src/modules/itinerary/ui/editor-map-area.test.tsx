import { act, fireEvent, render, screen } from "@testing-library/react";
import { useEffect } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EditorMapArea, type EditorMapAreaProps } from "./editor-map-area";
import { narrowViewport, wideViewport } from "./editor-map-viewport";
import type { MapStatus } from "./map/trip-map";

const h = vi.hoisted(() => ({ props: null as Record<string, unknown> | null, mounts: 0 }));

// Thay bản đồ thật (cần WebGL) bằng bản giả: lưu props cuối và đếm số lần mount (mỗi `key` mới là một lần mount).
vi.mock("./map/trip-map.lazy", () => ({
  LazyTripMap: function FakeTripMap(props: Record<string, unknown> & { onStatusChange(status: string): void }) {
    h.props = props;
    useEffect(() => {
      h.mounts += 1;
      props.onStatusChange("loading");
    }, []); // eslint-disable-line react-hooks/exhaustive-deps -- chỉ báo một lần lúc mount, giống TripMap thật
    return <div data-testid="fake-trip-map" />;
  },
}));

const report = (status: MapStatus) => act(() => (h.props?.onStatusChange as (s: MapStatus) => void)(status));

const MAP: EditorMapAreaProps["map"] = { pins: [], routes: [], camera: null };

function setup(overrides: Partial<EditorMapAreaProps> = {}) {
  const handlers = { onPinSelect: vi.fn(), onBackgroundClick: vi.fn() };
  const onStatusChange = vi.fn();
  const props: EditorMapAreaProps = {
    frame: { wide: true, viewport: wideViewport() },
    map: MAP,
    empty: false,
    handlers,
    fallback: <div data-testid="fallback">tóm tắt dự phòng</div>,
    onStatusChange,
    ...overrides,
  };
  const view = render(<EditorMapArea {...props} />);
  return { ...view, props, handlers, onStatusChange };
}

beforeEach(() => {
  h.props = null;
  h.mounts = 0;
});
afterEach(() => {
  vi.useRealTimers();
});

describe("đang tải", () => {
  it("section 'Bản đồ lịch trình', Skeleton phủ kín và trạng thái đọc 'Đang tải bản đồ…'", () => {
    setup();

    const section = screen.getByRole("region", { name: "Bản đồ lịch trình" });
    expect(section.tabIndex).toBe(-1);
    expect(screen.getByRole("heading", { level: 2, name: "Bản đồ lịch trình" }).className).toContain("sr-only");
    expect(screen.getByRole("status").textContent).toBe("Đang tải bản đồ…");
    expect(section.querySelector("[data-variant='block']")).not.toBeNull();
    expect(screen.getByTestId("fake-trip-map")).toBeTruthy();
  });

  it("báo loading cho nơi gọi", () => {
    const { onStatusChange } = setup();

    expect(onStatusChange).toHaveBeenCalledWith("loading");
  });
});

describe("sẵn sàng", () => {
  it("bỏ skeleton, báo ready", () => {
    const { onStatusChange } = setup();

    report("ready");

    expect(screen.queryByText("Đang tải bản đồ…")).toBeNull();
    expect(onStatusChange).toHaveBeenLastCalledWith("ready");
  });

  it("chưa có điểm: hiện chip, không phải nút; có điểm thì không có chip", () => {
    const { unmount } = setup({ empty: true });
    report("ready");
    const chip = screen.getByText("Thêm điểm đến để thấy trên bản đồ");
    expect(chip.closest("button")).toBeNull();
    unmount();

    setup({ empty: false });
    report("ready");
    expect(screen.queryByText("Thêm điểm đến để thấy trên bản đồ")).toBeNull();
  });

  it("chip chưa hiện khi còn đang tải", () => {
    setup({ empty: true });

    expect(screen.queryByText("Thêm điểm đến để thấy trên bản đồ")).toBeNull();
  });

  it("truyền pins, routes, camera, viewport và handler xuống bản đồ", () => {
    const camera = { seq: 3, kind: "focus", center: [108, 16] } as const;
    const frame = { wide: false, viewport: narrowViewport({ open: true, snap: "medium", viewportHeight: 844, headerHeight: 64 }) };
    const { handlers } = setup({ frame, map: { pins: [], routes: [], camera } });

    expect(h.props?.camera).toBe(camera);
    expect(h.props?.viewport).toBe(frame.viewport);
    expect(h.props?.onPinSelect).toBe(handlers.onPinSelect);
    expect(h.props?.onBackgroundClick).toBe(handlers.onBackgroundClick);
  });
});

describe("lỗi", () => {
  it("hiện thông báo, nút thử lại và dự phòng; gỡ bản đồ", () => {
    const { onStatusChange } = setup();

    report("error");

    expect(screen.queryByTestId("fake-trip-map")).toBeNull();
    const alert = screen.getByRole("status");
    expect(alert.textContent).toContain("Không tải được bản đồ");
    expect(screen.getByText("Bạn vẫn sửa lịch trình như bình thường.")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Thử tải lại bản đồ" }).textContent).toBe("Thử lại");
    expect(screen.getByTestId("fallback")).toBeTruthy();
    expect(onStatusChange).toHaveBeenLastCalledWith("error");
  });

  it("desktop: khối lỗi có p-section và cuộn dọc", () => {
    setup();
    report("error");

    const block = screen.getByTestId("fallback").parentElement?.parentElement as HTMLElement;
    expect(block.className.split(/\s+/)).toEqual(expect.arrayContaining(["p-section", "overflow-y-auto"]));
  });

  it("mobile: khối lỗi cuộn được, chừa mức peek, alert trong p-stack-md", () => {
    setup({ frame: { wide: false, viewport: narrowViewport({ open: true, snap: "medium", viewportHeight: 844, headerHeight: 64 }) } });
    report("error");

    const block = screen.getByTestId("fallback").parentElement?.parentElement as HTMLElement;
    expect(block.className.split(/\s+/)).toEqual(expect.arrayContaining(["overflow-y-auto", "pb-(--sheet-snap-peek)"]));
    expect(screen.getByRole("status").parentElement?.className).toContain("p-stack-md");
  });

  it("quá 15 giây chưa load thì chuyển sang lỗi", () => {
    vi.useFakeTimers();
    const { onStatusChange } = setup();

    act(() => vi.advanceTimersByTime(14_999));
    expect(onStatusChange).not.toHaveBeenCalledWith("error");
    act(() => vi.advanceTimersByTime(1));

    expect(onStatusChange).toHaveBeenLastCalledWith("error");
    expect(screen.getByRole("button", { name: "Thử tải lại bản đồ" })).toBeTruthy();
  });

  it("load ở 14 999 ms thì không lỗi dù qua mốc 15 giây", () => {
    vi.useFakeTimers();
    const { onStatusChange } = setup();

    act(() => vi.advanceTimersByTime(14_999));
    report("ready");
    act(() => vi.advanceTimersByTime(5_000));

    expect(onStatusChange).not.toHaveBeenCalledWith("error");
    expect(screen.queryByRole("button", { name: "Thử tải lại bản đồ" })).toBeNull();
  });
});

describe("Thử lại", () => {
  it("về đang tải, tạo lại bản đồ và đưa focus vào section", () => {
    const { onStatusChange } = setup();
    report("error");
    expect(h.mounts).toBe(1);

    fireEvent.click(screen.getByRole("button", { name: "Thử tải lại bản đồ" }));

    expect(onStatusChange).toHaveBeenLastCalledWith("loading");
    expect(h.mounts).toBe(2);
    expect(screen.getByRole("status").textContent).toBe("Đang tải bản đồ…");
    expect(document.activeElement).toBe(screen.getByRole("region", { name: "Bản đồ lịch trình" }));
  });

  it("lỗi lần nữa thì focus vào nút 'Thử lại'", () => {
    setup();
    report("error");
    fireEvent.click(screen.getByRole("button", { name: "Thử tải lại bản đồ" }));

    report("error");

    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Thử tải lại bản đồ" }));
  });

  it("lần lỗi đầu không cướp focus", () => {
    setup();

    report("error");

    expect(document.activeElement).not.toBe(screen.getByRole("button", { name: "Thử tải lại bản đồ" }));
  });
});
