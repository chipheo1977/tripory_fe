import { expect, it } from "vitest";
import { initialLocationMode, manualRestoreOf } from "./location-mode";

const SAVED = "10.7769, 106.7009";

it.each([
  ["về thủ công, ô trống, chưa chọn → tọa độ đã lưu", { next: "manual", raw: "  ", hasPicked: false, saved: SAVED }, SAVED],
  ["sang chế độ tìm → không đụng", { next: "search", raw: "", hasPicked: false, saved: SAVED }, null],
  ["đã chọn địa điểm → không đụng", { next: "manual", raw: "", hasPicked: true, saved: SAVED }, null],
  ["người dùng đã nhập → không ghi đè", { next: "manual", raw: "21.0285, 105.8542", hasPicked: false, saved: SAVED }, null],
  ["form thêm (không có tọa độ đã lưu) → không đụng", { next: "manual", raw: "", hasPicked: false, saved: "" }, null],
] as const)("%s", (_label, input, expected) => {
  expect(manualRestoreOf(input)).toBe(expected);
});

it.each([
  ["", "search"],
  ["   ", "search"],
  ["11.940400, 108.458300", "manual"],
  ["https://maps.app.goo.gl/abc", "manual"],
])("vị trí %j → chế độ %s", (location, mode) => {
  expect(initialLocationMode(location)).toBe(mode);
});
