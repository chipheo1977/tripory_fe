import type { MapPinModel } from "@tripory/itinerary";
import { describe, expect, it } from "vitest";
import { toLngLat, toTripMapPins } from "./editor-map-pins";

const pin = (waypointId: string, dayNumber: number): MapPinModel => ({
  waypointId,
  name: `Điểm ${waypointId}`,
  dayNumber,
  position: 1,
  colorIndex: dayNumber,
  coordinate: [108, 16],
  state: "normal",
  stackOrder: 1,
});

describe("toTripMapPins", () => {
  const pins = [pin("a", 1), pin("b", 2)];

  it("Tổng quan: nhãn có dòng 'Ngày N' đúng ngày", () => {
    expect(toTripMapPins(pins, "overview").map((item) => item.labelDetail)).toEqual(["Ngày 1", "Ngày 2"]);
  });

  it("tab ngày: không có labelDetail", () => {
    expect(toTripMapPins(pins, 2).map((item) => item.labelDetail)).toEqual([undefined, undefined]);
  });

  it("không đổi các trường khác", () => {
    expect(toTripMapPins(pins, "overview")[0]).toMatchObject({ waypointId: "a", state: "normal", stackOrder: 1 });
  });
});

describe("toLngLat", () => {
  it("trả [kinh độ, vĩ độ]", () => {
    expect(toLngLat({ latitude: 10.77, longitude: 106.7 } as never)).toEqual([106.7, 10.77]);
  });
});
