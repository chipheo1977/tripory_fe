import { renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useQrDownload } from "./use-qr-download";

const URL_A = "https://site.test/itineraries/abc";

let fillRect: ReturnType<typeof vi.fn>;
let toBlob: ReturnType<typeof vi.fn>;
let click: ReturnType<typeof vi.spyOn>;
let anchors: HTMLAnchorElement[];

beforeEach(() => {
  fillRect = vi.fn();
  toBlob = vi.fn((callback: (blob: Blob | null) => void) => callback(new Blob(["x"], { type: "image/png" })));
  anchors = [];
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(
    () => ({ fillRect, fillStyle: "" }) as unknown as CanvasRenderingContext2D,
  );
  vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation(
    toBlob as unknown as HTMLCanvasElement["toBlob"],
  );
  URL.createObjectURL = vi.fn(() => "blob:tripory-qr");
  URL.revokeObjectURL = vi.fn();
  click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement) {
    anchors.push(this);
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("useQrDownload", () => {
  it("paints a 512px canvas and downloads the png under the given name", async () => {
    const { result } = renderHook(() => useQrDownload());

    await expect(result.current.download({ url: URL_A, fileName: "tripory-sai-gon.png" })).resolves.toBe("ok");

    expect(click).toHaveBeenCalledTimes(1);
    expect(anchors[0]?.download).toBe("tripory-sai-gon.png");
    expect(anchors[0]?.getAttribute("href")).toBe("blob:tripory-qr");
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:tripory-qr");
    expect(fillRect).toHaveBeenCalled();
  });

  it("sizes the canvas to 512x512", async () => {
    let created: HTMLCanvasElement | null = null;
    const original = document.createElement.bind(document);
    vi.spyOn(document, "createElement").mockImplementation(((tag: string) => {
      const element = original(tag);
      if (tag === "canvas") created = element as HTMLCanvasElement;
      return element;
    }) as typeof document.createElement);
    const { result } = renderHook(() => useQrDownload());

    await result.current.download({ url: URL_A, fileName: "x.png" });

    const canvas = created as HTMLCanvasElement | null;
    expect(canvas?.width).toBe(512);
    expect(canvas?.height).toBe(512);
  });

  it("fails without clicking when the canvas has no 2d context", async () => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
    const { result } = renderHook(() => useQrDownload());

    await expect(result.current.download({ url: URL_A, fileName: "x.png" })).resolves.toBe("failed");
    expect(click).not.toHaveBeenCalled();
  });

  it("fails when toBlob yields null", async () => {
    toBlob.mockImplementation((callback: (blob: Blob | null) => void) => callback(null));
    const { result } = renderHook(() => useQrDownload());

    await expect(result.current.download({ url: URL_A, fileName: "x.png" })).resolves.toBe("failed");
    expect(click).not.toHaveBeenCalled();
  });

  it("revokes the object url even when the click throws, and reports failed", async () => {
    click.mockImplementation(() => {
      throw new Error("blocked");
    });
    const { result } = renderHook(() => useQrDownload());

    await expect(result.current.download({ url: URL_A, fileName: "x.png" })).resolves.toBe("failed");
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:tripory-qr");
  });
});
