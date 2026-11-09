import type { GeoBounds } from "@tripory/itinerary";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  cameraCallFor,
  DESKTOP_INSETS,
  isInsideSafeArea,
  moveDuration,
  prefersReducedMotion,
} from "./map-camera";

const BOUNDS: GeoBounds = [
  [108.0, 15.9],
  [108.5, 16.5],
];

describe("moveDuration", () => {
  it("480ms thường, 0 khi giảm chuyển động", () => {
    expect(moveDuration(false)).toBe(480);
    expect(moveDuration(true)).toBe(0);
  });
});

describe("cameraCallFor", () => {
  it("fit khung: fitBounds với zoom tối đa 15, padding và 480ms", () => {
    expect(cameraCallFor({ seq: 1, kind: "fit", target: { kind: "bounds", bounds: BOUNDS } }, DESKTOP_INSETS, false)).toEqual({
      method: "fitBounds",
      bounds: BOUNDS,
      options: { padding: DESKTOP_INSETS, maxZoom: 15, duration: 480 },
    });
  });

  it("fit một điểm: easeTo ở zoom 14", () => {
    expect(cameraCallFor({ seq: 1, kind: "fit", target: { kind: "point", center: [108.2, 16.0] } }, DESKTOP_INSETS, false)).toEqual({
      method: "easeTo",
      options: { center: [108.2, 16.0], zoom: 14, padding: DESKTOP_INSETS, duration: 480 },
    });
  });

  it.each(["focus", "reveal"] as const)("%s: easeTo giữ zoom (không có khóa zoom)", (kind) => {
    const call = cameraCallFor({ seq: 2, kind, center: [108.2, 16.0] }, DESKTOP_INSETS, false);

    expect(call.method).toBe("easeTo");
    expect(call.options).toEqual({ center: [108.2, 16.0], padding: DESKTOP_INSETS, duration: 480 });
    expect("zoom" in call.options).toBe(false);
  });

  it.each([
    { seq: 1, kind: "fit", target: { kind: "bounds", bounds: BOUNDS } },
    { seq: 1, kind: "fit", target: { kind: "point", center: [108.2, 16.0] } },
    { seq: 1, kind: "focus", center: [108.2, 16.0] },
    { seq: 1, kind: "reveal", center: [108.2, 16.0] },
  ] as const)("giảm chuyển động: duration 0 cho $kind", (command) => {
    expect(cameraCallFor(command, DESKTOP_INSETS, true).options.duration).toBe(0);
  });
});

describe("isInsideSafeArea", () => {
  const size = { width: 1040, height: 836 };

  it.each([
    [{ x: 500, y: 400 }, true],
    [{ x: 64, y: 148 }, true],
    [{ x: 500, y: 100 }, false],
    [{ x: 1000, y: 400 }, false],
    [{ x: 30, y: 400 }, false],
    [{ x: 500, y: 800 }, false],
  ])("%j -> %s", (point, expected) => {
    expect(isInsideSafeArea(point, size, DESKTOP_INSETS)).toBe(expected);
  });
});

describe("prefersReducedMotion", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("false khi không có matchMedia", () => {
    vi.stubGlobal("window", {});

    expect(prefersReducedMotion()).toBe(false);
  });

  it("đọc lại mỗi lần gọi", () => {
    const matches = vi.fn(() => false);
    vi.stubGlobal("window", { matchMedia: (query: string) => ({ matches: matches(), media: query }) });

    expect(prefersReducedMotion()).toBe(false);
    matches.mockReturnValue(true);
    expect(prefersReducedMotion()).toBe(true);
  });
});
