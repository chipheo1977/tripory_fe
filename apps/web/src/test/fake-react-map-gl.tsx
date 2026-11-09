// Chỉ dùng cho test jsdom (không có WebGL): thay `react-map-gl/maplibre` bằng bản giả, theo thiết kế ở 04-RESEARCH R9.4.
// Dùng: `vi.mock("react-map-gl/maplibre", () => import("@/test/fake-react-map-gl"))`, rồi đọc `fakeMapState.props`
// (props cuối của Map) và gọi `props.onLoad({ target: fakeMapInstance })` để giả lập sự kiện.
import { forwardRef, useEffect, useImperativeHandle, useRef, type CSSProperties, type ReactNode } from "react";
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

// Giống `MapRef` thật của react-map-gl (create-ref.js): chỉ có các HÀM của bản đồ (trừ nhóm bị bỏ qua như `setMinZoom`)
// và `getMap()`; KHÔNG có thuộc tính đối tượng như `touchZoomRotate`/`keyboard`. Mock quá rộng từng che mất lỗi
// `Cannot read properties of undefined (reading 'disableRotation')` ở UAT.
const SKIPPED_METHODS = new Set(["setMinZoom"]);
export const fakeMapRef = {
  getMap: () => fakeMapInstance,
  ...Object.fromEntries(
    Object.entries(fakeMapInstance).filter(([key, value]) => typeof value === "function" && !SKIPPED_METHODS.has(key)),
  ),
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
  useImperativeHandle(ref, () => fakeMapRef);
  return (
    <div data-testid="fake-map" onClick={() => props.onClick?.({})}>
      {props.children as ReactNode}
    </div>
  );
});

/**
 * Giống `applyReactStyle` của react-map-gl 8: gán từng khóa lên `element.style`, KHÔNG bao giờ xóa khóa đã bỏ khỏi `style`.
 * Gán `undefined` vào thuộc tính CSS là không đổi gì, nên giá trị cũ (ví dụ `pointerEvents: "none"`) dính mãi. Nếu fake để
 * React tự cập nhật `style` thì lỗi này không bao giờ lộ ra trong test.
 */
function applyReactStyle(element: HTMLElement | null, style: CSSProperties | undefined): void {
  if (element === null || style === undefined) return;
  const target = element.style as unknown as Record<string, unknown>;
  for (const [key, value] of Object.entries(style)) {
    if (value === undefined) continue;
    target[key] = value;
  }
}

export function Marker(props: AnyProps) {
  const style = props.style as CSSProperties | undefined;
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    applyReactStyle(ref.current, style);
  }, [style]);
  return (
    <div
      data-latitude={props.latitude}
      data-longitude={props.longitude}
      data-testid="fake-marker"
      onClick={(event) => props.onClick?.({ originalEvent: { stopPropagation: () => event.stopPropagation() } })}
      ref={ref}
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
