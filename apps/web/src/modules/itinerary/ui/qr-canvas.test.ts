import { describe, expect, it } from "vitest";
import { paintQr, QR_DARK, QR_IMAGE_PIXELS, QR_LIGHT, type QrPaintTarget } from "./qr-canvas";
import type { QrMatrix } from "./qr-matrix";

type Call = Readonly<{ style: string; x: number; y: number; w: number; h: number }>;

function recorder() {
  const calls: Call[] = [];
  const ctx: QrPaintTarget = {
    fillStyle: "",
    fillRect(x, y, w, h) {
      calls.push({ style: String(ctx.fillStyle), x, y, w, h });
    },
  };
  return { ctx, calls };
}

const MATRIX: QrMatrix = {
  size: 3,
  rows: [
    [true, false, true],
    [false, true, false],
    [true, false, false],
  ],
};

describe("paintQr", () => {
  it("exposes the 512px black on white contract", () => {
    expect(QR_IMAGE_PIXELS).toBe(512);
    expect(QR_DARK).toBe("#000000");
    expect(QR_LIGHT).toBe("#FFFFFF");
  });

  it("paints the light background over the whole image first", () => {
    const { ctx, calls } = recorder();
    paintQr(ctx, MATRIX, 512);

    expect(calls[0]).toEqual({ style: "#FFFFFF", x: 0, y: 0, w: 512, h: 512 });
  });

  it("paints exactly one dark cell per dark module", () => {
    const { ctx, calls } = recorder();
    paintQr(ctx, MATRIX, 512);

    const dark = calls.filter((call) => call.style === "#000000");
    expect(dark).toHaveLength(4);
  });

  it("keeps every cell inside the canvas origin and leaves no gap between neighbours", () => {
    const { ctx, calls } = recorder();
    paintQr(ctx, MATRIX, 512);

    const dark = calls.filter((call) => call.style === "#000000");
    for (const cell of dark) {
      expect(cell.x).toBeGreaterThanOrEqual(0);
      expect(cell.y).toBeGreaterThanOrEqual(0);
      expect(cell.w).toBe(dark[0]?.w);
    }
    const first = dark[0];
    const second = dark[1];
    expect(first && second && second.x - first.x <= first.w * 2).toBe(true);
  });

  it("rounds cell positions down and sizes up so non-divisible sizes leave no hairline gap", () => {
    const { ctx, calls } = recorder();
    paintQr(ctx, { size: 7, rows: Array.from({ length: 7 }, () => Array.from({ length: 7 }, () => true)) }, 512);

    const dark = calls.filter((call) => call.style === "#000000");
    const cell = 512 / 7;
    expect(dark[1]?.x).toBe(Math.floor(cell));
    expect(dark[0]?.w).toBe(Math.ceil(cell));
    expect((dark[1]?.x ?? 0) - (dark[0]?.x ?? 0)).toBeLessThanOrEqual(dark[0]?.w ?? 0);
  });
});
