import { describe, expect, it } from "vitest";
import {
  blockSummary,
  CREATE_BLOCKS,
  firstInvalidBlock,
  focusTargetOfBlock,
  invalidBlocks,
  type BlockSummaryInput,
} from "./create-itinerary-blocks";

const input = (patch: Partial<BlockSummaryInput> = {}): BlockSummaryInput => ({
  destinationName: null,
  title: "",
  startDate: "",
  dayCount: 3,
  interestLabels: [],
  ...patch,
});

describe("CREATE_BLOCKS", () => {
  it("thứ tự khối cố định", () => {
    expect(CREATE_BLOCKS).toEqual(["destination", "name", "dates", "interests"]);
  });
});

describe("firstInvalidBlock / invalidBlocks", () => {
  it("không lỗi thì null và tập rỗng", () => {
    expect(firstInvalidBlock({})).toBeNull();
    expect(invalidBlocks({}).size).toBe(0);
  });

  it("chọn theo thứ tự khối, không theo thứ tự khóa", () => {
    expect(firstInvalidBlock({ interests: {}, title: {} })).toBe("name");
  });

  it("lỗi dayCount thuộc khối dates", () => {
    expect(firstInvalidBlock({ dayCount: {} })).toBe("dates");
  });

  it("trả đúng tập khối lỗi", () => {
    expect([...invalidBlocks({ destinationCode: {}, startDate: {}, dayCount: {} })].toSorted()).toEqual([
      "dates",
      "destination",
    ]);
  });
});

describe("focusTargetOfBlock", () => {
  it("dates: dayCount mặc định, startDate khi ô này lỗi", () => {
    expect(focusTargetOfBlock("dates", { dayCount: {} })).toBe("dayCount");
    expect(focusTargetOfBlock("dates", { startDate: {}, dayCount: {} })).toBe("startDate");
  });

  it("các khối còn lại ánh xạ đúng ô", () => {
    expect(focusTargetOfBlock("destination", {})).toBe("destinationCode");
    expect(focusTargetOfBlock("name", {})).toBe("title");
    expect(focusTargetOfBlock("interests", {})).toBe("interests");
  });
});

describe("blockSummary", () => {
  it("destination", () => {
    expect(blockSummary("destination", input({ destinationName: "Đà Nẵng" }))).toBe("Đà Nẵng");
    expect(blockSummary("destination", input())).toBe("Chưa chọn");
  });

  it("name", () => {
    expect(blockSummary("name", input({ title: " Chuyến đi Đà Nẵng " }))).toBe("Chuyến đi Đà Nẵng");
    expect(blockSummary("name", input({ title: "   " }))).toBe("Chưa đặt tên");
  });

  it("dates", () => {
    expect(blockSummary("dates", input())).toBe("3 ngày");
    expect(blockSummary("dates", input({ startDate: "2026-11-12" }))).toBe("3 ngày, từ 12/11/2026");
    expect(blockSummary("dates", input({ startDate: "2026-02-30" }))).toBe("3 ngày");
  });

  it("interests", () => {
    expect(blockSummary("interests", input({ interestLabels: ["Thiên nhiên", "Mua sắm"] }))).toBe("Thiên nhiên, Mua sắm");
    expect(blockSummary("interests", input())).toBe("Chưa chọn");
  });
});
