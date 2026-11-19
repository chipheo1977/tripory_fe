import { describe, expect, it } from "vitest";
import {
  commentCountLabel,
  commentHeading,
  counterText,
  formatAbsoluteDateTime,
  formatCommentTime,
  formatCount,
  formatRelativeTime,
  likeDescription,
} from "./social-format";

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const NOW = new Date(2026, 10, 20, 12, 0).getTime();
const ago = (ms: number) => new Date(NOW - ms).toISOString();
const localDate = (ms: number) => {
  const date = new Date(NOW - ms);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;
};

describe("formatCount", () => {
  it.each([
    [0, "0"],
    [999, "999"],
    [1234, "1.234"],
    [1234567, "1.234.567"],
    [-3, "0"],
    [Number.NaN, "0"],
    [Number.POSITIVE_INFINITY, "0"],
  ])("%d → %s", (value, expected) => {
    expect(formatCount(value)).toBe(expected);
  });
});

describe("nhãn đếm", () => {
  it("likeDescription", () => {
    expect(likeDescription(12)).toBe("12 lượt thích");
    expect(likeDescription(0)).toBe("0 lượt thích");
  });
  it("commentHeading", () => {
    expect(commentHeading(0)).toBe("Bình luận (0)");
    expect(commentHeading(1234)).toBe("Bình luận (1.234)");
  });
  it("commentCountLabel", () => {
    expect(commentCountLabel(3)).toBe("3 bình luận");
  });
  it("counterText", () => {
    expect(counterText(7)).toBe("7/500");
  });
});

describe("formatRelativeTime", () => {
  it.each([
    ["30 giây", 30 * SECOND, "Vừa xong"],
    ["59 giây", 59 * SECOND, "Vừa xong"],
    ["tương lai 5 phút", -5 * MINUTE, "Vừa xong"],
    ["60 giây", 60 * SECOND, "1 phút trước"],
    ["5 phút", 5 * MINUTE, "5 phút trước"],
    ["59 phút", 59 * MINUTE, "59 phút trước"],
    ["60 phút", 60 * MINUTE, "1 giờ trước"],
    ["3 giờ", 3 * HOUR, "3 giờ trước"],
    ["23 giờ 59 phút", 23 * HOUR + 59 * MINUTE, "23 giờ trước"],
    ["24 giờ", 24 * HOUR, "1 ngày trước"],
    ["2 ngày", 2 * DAY, "2 ngày trước"],
    ["6 ngày 23 giờ", 6 * DAY + 23 * HOUR, "6 ngày trước"],
  ])("cách %s → %s", (_name, ms, expected) => {
    expect(formatRelativeTime(ago(ms), NOW)).toBe(expected);
  });

  it.each([7 * DAY, 8 * DAY])("từ 7 ngày hiện ngày tuyệt đối (%d ms)", (ms) => {
    expect(formatRelativeTime(ago(ms), NOW)).toBe(localDate(ms));
    expect(formatRelativeTime(ago(ms), NOW)).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
  });

  it("chuỗi không hợp lệ trả rỗng, không ném", () => {
    expect(formatRelativeTime("không phải ngày", NOW)).toBe("");
  });
});

describe("formatCommentTime", () => {
  it("chưa biết bây giờ thì hiện ngày tuyệt đối", () => {
    expect(formatCommentTime(ago(5 * MINUTE), null)).toBe(localDate(5 * MINUTE));
  });
  it("có bây giờ thì như formatRelativeTime", () => {
    expect(formatCommentTime(ago(5 * MINUTE), NOW)).toBe("5 phút trước");
  });
  it("chuỗi không hợp lệ trả rỗng", () => {
    expect(formatCommentTime("x", null)).toBe("");
    expect(formatCommentTime("x", NOW)).toBe("");
  });
});

describe("formatAbsoluteDateTime", () => {
  it("HH:mm dd/MM/yyyy giờ địa phương", () => {
    expect(formatAbsoluteDateTime(new Date(2026, 10, 12, 8, 5).toISOString())).toBe("08:05 12/11/2026");
  });
  it("chuỗi không hợp lệ trả rỗng", () => {
    expect(formatAbsoluteDateTime("x")).toBe("");
  });
});
