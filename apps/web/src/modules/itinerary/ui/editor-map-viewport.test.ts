import { snapHeightPx } from "@tripory/ui-web";
import { describe, expect, it } from "vitest";
import { narrowViewport, REOPEN_CHIP_AREA_PX, wideViewport } from "./editor-map-viewport";

describe("wideViewport", () => {
  it("padding 64 mỗi cạnh, không có phần bị che", () => {
    expect(wideViewport()).toEqual({ padding: { top: 64, right: 64, bottom: 64, left: 64 }, coveredBottom: 0 });
  });
});

describe("narrowViewport", () => {
  it("sheet mở: phần bị che bằng chiều cao mức snap, dưới = che + 32", () => {
    const covered = snapHeightPx(844, 64, "medium");

    expect(narrowViewport({ open: true, snap: "medium", viewportHeight: 844, headerHeight: 64 })).toEqual({
      padding: { top: 64, left: 32, right: 32, bottom: covered + 32 },
      coveredBottom: covered,
    });
  });

  it.each(["peek", "medium", "expanded"] as const)("mức %s khớp snapHeightPx", (snap) => {
    const result = narrowViewport({ open: true, snap, viewportHeight: 844, headerHeight: 64 });

    expect(result.coveredBottom).toBe(snapHeightPx(844, 64, snap));
    expect(result.padding.bottom).toBe(result.coveredBottom + 32);
  });

  it("sheet đóng: chừa vùng chip 'Lịch trình' 76px", () => {
    const result = narrowViewport({ open: false, snap: "medium", viewportHeight: 844, headerHeight: 64 });

    expect(REOPEN_CHIP_AREA_PX).toBe(76);
    expect(result.coveredBottom).toBe(76);
    expect(result.padding.bottom).toBe(108);
  });

  it("mức expanded ở 320×568 không vượt chiều cao vùng bản đồ", () => {
    const result = narrowViewport({ open: true, snap: "expanded", viewportHeight: 568, headerHeight: 64 });

    expect(result.coveredBottom).toBeLessThanOrEqual(568 - 64);
  });

  it("chiều cao vùng bản đồ bằng 0 thì không âm", () => {
    const result = narrowViewport({ open: false, snap: "medium", viewportHeight: 40, headerHeight: 64 });

    expect(result.coveredBottom).toBe(0);
  });
});
