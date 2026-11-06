import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { DayRouteModel } from "@tripory/itinerary";
import { VIETNAM_VIEW_BOUNDS } from "@tripory/itinerary";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fakeMapCanvas, fakeMapInstance, fakeMapState, resetFakeMap, setFakeCanvasSize } from "@/test/fake-react-map-gl";
import { BASEMAP_STYLE } from "./basemap-style";
import { DESKTOP_VIEWPORT, prefersReducedMotion, type MapCameraCommand } from "./map-camera";
import { TripMap, type TripMapPin, type TripMapProps } from "./trip-map";

vi.mock("react-map-gl/maplibre", () => import("@/test/fake-react-map-gl"));
vi.mock("./day-colors", () => ({
  readDayColors: () => ["#c1", "#c2", "#c3", "#c4", "#c5", "#c6", "#c7", "#c8"],
  readDimmedOpacity: () => 0.35,
}));
vi.mock("./map-camera", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./map-camera")>()),
  prefersReducedMotion: vi.fn(() => false),
}));

const pin = (overrides: Partial<TripMapPin> & Pick<TripMapPin, "waypointId">): TripMapPin => ({
  name: `Điểm ${overrides.waypointId}`,
  dayNumber: 1,
  position: 1,
  colorIndex: 1,
  coordinate: [108.2, 16.0],
  state: "normal",
  stackOrder: 1,
  ...overrides,
});

const PINS: readonly TripMapPin[] = [
  pin({ waypointId: "w-dimmed", state: "dimmed", stackOrder: 1, position: 1, colorIndex: 2, dayNumber: 2 }),
  pin({ waypointId: "w-normal", state: "normal", stackOrder: 2, position: 1 }),
  pin({ waypointId: "w-selected", state: "selected", stackOrder: 3, position: 2, labelDetail: "Ngày 1" }),
];

const ROUTES: readonly DayRouteModel[] = [
  { dayNumber: 1, colorIndex: 1, coordinates: [[108.2, 16.0], [108.3, 16.1]], dimmed: false, sortKey: 1 },
  { dayNumber: 2, colorIndex: 2, coordinates: [[109.0, 12.0], [109.1, 12.1]], dimmed: true, sortKey: 0 },
];

function setup(props: Partial<TripMapProps> = {}) {
  const handlers = { onPinSelect: vi.fn(), onBackgroundClick: vi.fn(), onStatusChange: vi.fn() };
  const base: TripMapProps = { pins: PINS, routes: ROUTES, camera: null, viewport: DESKTOP_VIEWPORT, ...handlers };
  const view = render(<TripMap {...base} {...props} />);
  const rerender = (next: Partial<TripMapProps>) => view.rerender(<TripMap {...base} {...props} {...next} />);
  return { ...handlers, rerender, user: userEvent.setup() };
}

const mapProps = () => fakeMapState.props ?? {};
const load = () => act(() => mapProps().onLoad({ target: fakeMapInstance }));
const fit = (seq: number): MapCameraCommand => ({
  seq,
  kind: "fit",
  target: { kind: "bounds", bounds: [[108.0, 15.9], [108.5, 16.5]] },
});

beforeEach(() => {
  resetFakeMap();
  vi.mocked(prefersReducedMotion).mockReturnValue(false);
});

describe("cấu hình bản đồ", () => {
  it("dùng style riêng, worker, và tắt xoay/nghiêng/ghi công mặc định", () => {
    setup();

    const props = mapProps();
    expect(props.mapStyle).toBe(BASEMAP_STYLE);
    expect(String(props.workerUrl)).toContain("maplibre-gl-worker.mjs");
    expect(props.dragRotate).toBe(false);
    expect(props.touchPitch).toBe(false);
    expect(props.pitchWithRotate).toBe(false);
    expect(props.maxPitch).toBe(0);
    expect(props.maxZoom).toBe(18);
    expect(props.attributionControl).toBe(false);
    expect(props.cooperativeGestures).not.toBe(true);
    expect(props.locale["Map.Title"]).toBe(
      "Bản đồ lịch trình. Dùng phím mũi tên để di chuyển, phím cộng và trừ để phóng to, thu nhỏ.",
    );
  });
});

describe("nút bổ sung phía trên nút zoom", () => {
  const extra = <button type="button">Nút thêm</button>;

  it("nằm cùng cột và đứng trước nhóm zoom (thứ tự Tab: nút thêm rồi Phóng to), chỉ hiện khi bản đồ sẵn sàng", () => {
    setup({ topControls: extra });
    expect(screen.queryByRole("button", { name: "Nút thêm" })).toBeNull();

    load();

    const column = screen.getByRole("button", { name: "Nút thêm" }).parentElement as HTMLElement;
    expect(column.contains(screen.getByRole("group", { name: "Thu phóng bản đồ" }))).toBe(true);
    const order = [...column.querySelectorAll("button")].map((button) => button.getAttribute("aria-label") ?? button.textContent);
    expect(order).toEqual(["Nút thêm", "Phóng to", "Thu nhỏ"]);
  });

  it("không truyền thì cột chỉ có nhóm zoom", () => {
    setup();
    load();

    expect(screen.getByRole("group", { name: "Thu phóng bản đồ" }).parentElement?.children).toHaveLength(1);
  });
});

describe("pin", () => {
  it("vẽ mỗi điểm một pin, chỉ pin được chọn có nhãn, zIndex theo stackOrder", () => {
    setup();

    const markers = screen.getAllByTestId("fake-marker");
    expect(markers).toHaveLength(3);
    expect(markers.map((marker) => marker.style.zIndex)).toEqual(["1", "2", "3"]);
    expect(screen.getByText("Điểm w-selected")).toBeTruthy();
    expect(screen.getByText("Ngày 1")).toBeTruthy();
    expect(screen.queryByText("Điểm w-normal")).toBeNull();
    expect(markers[0]?.style.pointerEvents).toBe("none");
  });

  it("bấm pin thường gọi onPinSelect và không bỏ chọn", async () => {
    const { user, onPinSelect, onBackgroundClick } = setup();

    await user.click(screen.getAllByTestId("fake-marker")[1] as HTMLElement);

    expect(onPinSelect).toHaveBeenCalledTimes(1);
    expect(onPinSelect).toHaveBeenCalledWith("w-normal");
    expect(onBackgroundClick).not.toHaveBeenCalled();
  });

  it("pin mờ không chọn được (không nhận chuột, và có click lọt vào cũng bị bỏ qua)", () => {
    const { onPinSelect } = setup();
    const dimmed = screen.getAllByTestId("fake-marker")[0] as HTMLElement;

    expect(dimmed.style.pointerEvents).toBe("none");
    fireEvent.click(dimmed);

    expect(onPinSelect).not.toHaveBeenCalled();
  });

  it("pin từng bị mờ rồi thường lại thì nhận chuột lại (react-map-gl không xóa style cũ của marker)", async () => {
    const { user, onPinSelect, rerender } = setup({ pins: [pin({ waypointId: "w-1", state: "dimmed" })] });
    expect(screen.getByTestId("fake-marker").style.pointerEvents).toBe("none");

    rerender({ pins: [pin({ waypointId: "w-1", state: "normal" })] });
    expect(screen.getByTestId("fake-marker").style.pointerEvents).toBe("auto");
    await user.click(screen.getByTestId("fake-marker"));

    expect(onPinSelect).toHaveBeenCalledWith("w-1");
  });

  it("bấm nền bản đồ gọi onBackgroundClick", async () => {
    const { user, onBackgroundClick } = setup();

    await user.click(screen.getByTestId("fake-map"));

    expect(onBackgroundClick).toHaveBeenCalledTimes(1);
  });

  it("pin là phần tử không focus được", () => {
    setup();

    expect(screen.getAllByTestId("fake-marker").flatMap((marker) => [...marker.querySelectorAll("button, a, [tabindex]")])).toHaveLength(0);
  });
});

describe("trạng thái", () => {
  it("lúc mount là loading, chưa có nút zoom và ghi công", () => {
    const { onStatusChange } = setup();

    expect(onStatusChange).toHaveBeenCalledWith("loading");
    expect(screen.queryByRole("button", { name: "Phóng to" })).toBeNull();
    expect(screen.queryByRole("link", { name: "© OpenStreetMap" })).toBeNull();
  });

  it("load: ready, hiện nút zoom, ghi công và thiết lập canvas", () => {
    const { onStatusChange } = setup();

    load();

    expect(onStatusChange).toHaveBeenLastCalledWith("ready");
    expect(screen.getByRole("group", { name: "Thu phóng bản đồ" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "© OpenStreetMap" })).toBeTruthy();
    expect(fakeMapInstance.touchZoomRotate.disableRotation).toHaveBeenCalled();
    expect(fakeMapInstance.keyboard.disableRotation).toHaveBeenCalled();
    expect(fakeMapInstance.cameraForBounds).toHaveBeenCalledWith(
      [[VIETNAM_VIEW_BOUNDS[0][0], VIETNAM_VIEW_BOUNDS[0][1]], [VIETNAM_VIEW_BOUNDS[1][0], VIETNAM_VIEW_BOUNDS[1][1]]],
    );
    expect(mapProps().minZoom).toBe(4);
    expect(fakeMapCanvas.getAttribute("aria-describedby")).toBe(document.querySelector("p.sr-only")?.id);
  });

  it("lỗi trước load là error, lỗi sau load bị bỏ qua", () => {
    const { onStatusChange } = setup();

    act(() => mapProps().onError({ error: new Error("style") }));
    expect(onStatusChange).toHaveBeenLastCalledWith("error");

    onStatusChange.mockClear();
    load();
    onStatusChange.mockClear();
    act(() => mapProps().onError({ error: new Error("tile") }));

    expect(onStatusChange).not.toHaveBeenCalled();
  });

  it("Esc trên canvas bỏ chọn", () => {
    const { onBackgroundClick } = setup();
    load();

    fireEvent.keyDown(fakeMapCanvas, { key: "Escape" });
    fireEvent.keyDown(fakeMapCanvas, { key: "a" });

    expect(onBackgroundClick).toHaveBeenCalledTimes(1);
  });
});

describe("lệnh camera", () => {
  it("chạy đúng một lần cho mỗi seq", () => {
    const { rerender } = setup();
    load();

    rerender({ camera: fit(1) });
    rerender({ camera: fit(1) });

    expect(fakeMapInstance.fitBounds).toHaveBeenCalledTimes(1);
    expect(fakeMapInstance.fitBounds.mock.calls[0]?.[1]).toMatchObject({ maxZoom: 15, duration: 480 });
  });

  it("lệnh tới trước load được chạy ngay sau load", () => {
    setup({ camera: fit(1) });

    expect(fakeMapInstance.fitBounds).not.toHaveBeenCalled();
    load();

    expect(fakeMapInstance.fitBounds).toHaveBeenCalledTimes(1);
  });

  it("focus: easeTo giữ zoom", () => {
    const { rerender } = setup();
    load();

    rerender({ camera: { seq: 2, kind: "focus", center: [108.4, 16.2] } });

    expect(fakeMapInstance.easeTo).toHaveBeenCalledTimes(1);
    const options = fakeMapInstance.easeTo.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(options.center).toEqual([108.4, 16.2]);
    expect("zoom" in options).toBe(false);
  });

  it("giảm chuyển động: duration 0", () => {
    vi.mocked(prefersReducedMotion).mockReturnValue(true);
    const { rerender } = setup();
    load();

    rerender({ camera: fit(1) });
    rerender({ camera: { seq: 2, kind: "focus", center: [108.4, 16.2] } });

    expect(fakeMapInstance.fitBounds.mock.calls[0]?.[1]).toMatchObject({ duration: 0 });
    expect(fakeMapInstance.easeTo.mock.calls[0]?.[0]).toMatchObject({ duration: 0 });
  });

  it("reveal: không dời khi pin trong vùng an toàn", () => {
    fakeMapInstance.project.mockReturnValue({ x: 500, y: 400 });
    const { rerender } = setup();
    load();

    rerender({ camera: { seq: 3, kind: "reveal", center: [108.2, 16.0] } });

    expect(fakeMapInstance.easeTo).not.toHaveBeenCalled();
  });

  it("reveal: dời (giữ zoom) khi pin hoặc nhãn ra ngoài vùng an toàn", () => {
    fakeMapInstance.project.mockReturnValue({ x: 500, y: 100 });
    setFakeCanvasSize(1040, 836);
    const { rerender } = setup();
    load();

    rerender({ camera: { seq: 3, kind: "reveal", center: [108.2, 16.0] } });

    expect(fakeMapInstance.easeTo).toHaveBeenCalledTimes(1);
    expect("zoom" in (fakeMapInstance.easeTo.mock.calls[0]?.[0] as object)).toBe(false);
  });
});

describe("nút zoom", () => {
  it("gọi zoomIn và zoomOut với thời lượng chuyển động", async () => {
    const { user } = setup();
    load();

    await user.click(screen.getByRole("button", { name: "Phóng to" }));
    await user.click(screen.getByRole("button", { name: "Thu nhỏ" }));

    expect(fakeMapInstance.zoomIn).toHaveBeenCalledWith({ duration: 480 });
    expect(fakeMapInstance.zoomOut).toHaveBeenCalledWith({ duration: 480 });
  });

  it("giảm chuyển động: zoom không hoạt ảnh", async () => {
    vi.mocked(prefersReducedMotion).mockReturnValue(true);
    const { user } = setup();
    load();

    await user.click(screen.getByRole("button", { name: "Phóng to" }));

    expect(fakeMapInstance.zoomIn).toHaveBeenCalledWith({ duration: 0 });
  });

  it("vô hiệu ở biên: phóng to ở 18, thu nhỏ ở mức tối thiểu", () => {
    fakeMapState.zoom = 18;
    setup();
    load();
    expect((screen.getByRole("button", { name: "Phóng to" }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole("button", { name: "Thu nhỏ" }) as HTMLButtonElement).disabled).toBe(false);

    fakeMapState.zoom = 4;
    act(() => mapProps().onZoomEnd({}));

    expect((screen.getByRole("button", { name: "Thu nhỏ" }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole("button", { name: "Phóng to" }) as HTMLButtonElement).disabled).toBe(false);
  });
});

describe("đường nối", () => {
  it("một feature LineString mỗi ngày, màu từ token, mờ theo token độ mờ", () => {
    setup();
    load();

    const data = fakeMapState.routeData as { features: { properties: Record<string, unknown>; geometry: { type: string } }[] };
    expect(data.features).toHaveLength(2);
    expect(data.features.map((feature) => feature.geometry.type)).toEqual(["LineString", "LineString"]);
    expect(data.features.map((feature) => feature.properties)).toEqual([
      { color: "#c1", opacity: 0.9, sortKey: 1 },
      { color: "#c2", opacity: 0.35, sortKey: 0 },
    ]);
  });

  it("lớp line tròn đầu, rộng 4px, sắp theo sortKey", () => {
    setup();
    load();

    const layer = fakeMapState.routeLayer ?? {};
    expect(layer.type).toBe("line");
    expect(layer.layout).toMatchObject({ "line-join": "round", "line-cap": "round", "line-sort-key": ["get", "sortKey"] });
    expect(layer.paint).toMatchObject({ "line-width": 4, "line-color": ["get", "color"], "line-opacity": ["get", "opacity"] });
  });

  it("chưa load thì chưa có nguồn đường (chưa đọc được token)", () => {
    setup();

    expect(fakeMapState.routeData).toBeNull();
  });
});
