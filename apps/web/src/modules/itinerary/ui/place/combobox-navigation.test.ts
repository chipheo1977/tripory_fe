import { expect, it } from "vitest";
import { NO_ACTIVE_INDEX, nextActiveIndex } from "./combobox-navigation";

it.each([
  ["ArrowDown", -1, 3, 0],
  ["ArrowDown", 0, 3, 1],
  ["ArrowDown", 2, 3, 0],
  ["ArrowDown", 7, 3, 0],
  ["ArrowUp", -1, 3, 2],
  ["ArrowUp", 0, 3, 2],
  ["ArrowUp", 2, 3, 1],
  ["ArrowUp", 7, 3, 2],
  ["Enter", 1, 3, 1],
])("%s từ %i trong %i lựa chọn → %i", (key, current, count, expected) => {
  expect(nextActiveIndex(key, current, count)).toBe(expected);
});

it("danh sách rỗng → không có lựa chọn", () => {
  expect(nextActiveIndex("ArrowDown", 0, 0)).toBe(NO_ACTIVE_INDEX);
  expect(nextActiveIndex("ArrowUp", -1, 0)).toBe(NO_ACTIVE_INDEX);
});
