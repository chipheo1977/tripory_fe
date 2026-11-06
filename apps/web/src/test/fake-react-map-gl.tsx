// Chỉ dùng cho test jsdom (không có WebGL): thay `react-map-gl/maplibre` bằng bản giả, theo thiết kế ở 04-RESEARCH R9.4.
// Dùng: `vi.mock("react-map-gl/maplibre", () => import("@/test/fake-react-map-gl"))`, rồi đọc `fakeMapState.props`
// (props cuối của Map) và gọi `props.onLoad({ target: fakeMapInstance })` để giả lập sự kiện.
import { forwardRef, useImperativeHandle, type CSSProperties, type ReactNode } from "react";
import { vi } from "vitest";

type AnyProps = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

const canvas = document.createElement("div");
const canvasSize = { width: 1040, height: 836 };
Object.defineProperty(canvas, "clientWidth", { configurable: true, get: () => canvasSize.width });
Object.defineProperty(canvas, "clientHeight", { configurable: true, get: () => canvasSize.height });

export const fakeMapState = {
  props: null as AnyProps | null,
  zoom: 5,
  minZoom: 4,
  maxZoom: 18,
  routeData: null as unknown,
  routeLayer: null as AnyProps | null,
};

export const fakeMapCanvas = canvas;
export const setFakeCanvasSize = (width: number, height: number) => {
  canvasSize.width = width;
  canvasSize.height = height;
};

export const fakeMapInstance = {
  fitBounds: vi.fn(),
  easeTo: vi.fn(),
  jumpTo: vi.fn(),
  zoomIn: vi.fn(),
  zoomOut: vi.fn(),
  getZoom: vi.fn(() => fakeMapState.zoom),
  getMinZoom: vi.fn(() => fakeMapState.minZoom),
  getMaxZoom: vi.fn(() => fakeMapState.maxZoom),
  setMinZoom: vi.fn(),
  cameraForBounds: vi.fn(() => ({ zoom: 4 })),
  project: vi.fn(() => ({ x: 500, y: 400 })),
  getCanvas: vi.fn(() => canvas),
  touchZoomRotate: { disableRotation: vi.fn() },
  keyboard: { disableRotation: vi.fn() },
  on: vi.fn(),
  off: vi.fn(),
};

export function resetFakeMap() {
  fakeMapState.props = null;
  fakeMapState.zoom = 5;
  fakeMapState.minZoom = 4;
  fakeMapState.routeData = null;
  fakeMapState.routeLayer = null;
  setFakeCanvasSize(1040, 836);
  canvas.removeAttribute("aria-describedby");
  for (const value of Object.values(fakeMapInstance)) {
    if (typeof value === "function" && "mockClear" in value) (value as ReturnType<typeof vi.fn>).mockClear();
  }
  fakeMapInstance.touchZoomRotate.disableRotation.mockClear();
  fakeMapInstance.keyboard.disableRotation.mockClear();
}

// Ghi nhận props qua hàm (không gán trực tiếp trong lúc render) để khỏi vướng quy tắc immutability của React Compiler.
const capture = <K extends keyof typeof fakeMapState>(key: K, value: (typeof fakeMapState)[K]): void => {
  fakeMapState[key] = value;
};

export const Map = forwardRef<unknown, AnyProps>(function FakeMap(props, ref) {
  capture("props", props);
  useImperativeHandle(ref, () => fakeMapInstance);
  return (
    <div data-testid="fake-map" onClick={() => props.onClick?.({})}>
      {props.children as ReactNode}
    </div>
  );
});

export function Marker(props: AnyProps) {
  const style = props.style as CSSProperties | undefined;
  return (
    <div
      data-latitude={props.latitude}
      data-longitude={props.longitude}
      data-testid="fake-marker"
      onClick={(event) => props.onClick?.({ originalEvent: { stopPropagation: () => event.stopPropagation() } })}
      style={style}
    >
      {props.children as ReactNode}
    </div>
  );
}

export function Source(props: AnyProps) {
  capture("routeData", props.data);
  return <>{props.children as ReactNode}</>;
}

export function Layer(props: AnyProps) {
  capture("routeLayer", props);
  return null;
}
