import { expect, it } from "vitest";
import { initialLocationMode } from "./location-mode";

it.each([
  ["", "search"],
  ["   ", "search"],
  ["11.940400, 108.458300", "manual"],
  ["https://maps.app.goo.gl/abc", "manual"],
])("vị trí %j → chế độ %s", (location, mode) => {
  expect(initialLocationMode(location)).toBe(mode);
});
