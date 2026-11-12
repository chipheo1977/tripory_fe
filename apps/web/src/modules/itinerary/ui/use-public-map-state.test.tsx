import type { Itinerary } from "@tripory/itinerary";
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { makeFxItinerary, makeFxWaypoint } from "@/test/domain-itinerary-fixtures";
import { usePublicMapState } from "./use-public-map-state";

const setup = (itinerary: Itinerary = makeFxItinerary(), wide = true) =>
  renderHook((props: { itinerary: Itinerary; wide: boolean }) => usePublicMapState(props), {
    initialProps: { itinerary, wide },
  });

const WAYPOINT = (id: string) => makeFxItinerary().waypoints.find((waypoint) => waypoint.id === id)!;

describe("usePublicMapState: initial state", () => {
  it("starts on Tổng quan with nothing selected, one fit command and a loading map", () => {
    const { result } = setup();

    expect(result.current.tab).toBe("overview");
    expect(result.current.selectedId).toBeNull();
    expect(result.current.camera.kind).toBe("fit");
    expect(result.current.camera.seq).toBe(1);
    expect(result.current.mapStatus).toBe("loading");
    expect(result.current.sheetRequest).toBeNull();
    expect(result.current.tabFocus).toBeNull();
  });

  it("covers the whole day range including the sparse day", () => {
    const { result } = setup();

    expect(result.current.dayNumbers).toEqual([1, 2, 3]);
    expect(result.current.days.map((day) => day.waypointCount)).toEqual([2, 0, 1]);
  });
});

describe("usePublicMapState: tabs", () => {
  it("changeTab drops the selection and issues a new fit command", () => {
    const { result } = setup();
    act(() => result.current.handlePinSelect("w-1-0"));
    expect(result.current.selectedId).toBe("w-1-0");
    const before = result.current.camera.seq;

    act(() => result.current.changeTab(3));

    expect(result.current.tab).toBe(3);
    expect(result.current.selectedId).toBeNull();
    expect(result.current.camera.kind).toBe("fit");
    expect(result.current.camera.seq).toBeGreaterThan(before);
    expect(result.current.dayView.dayNumber).toBe(3);
  });

  it("selectDayFromRow changes the tab and asks for focus once per call", () => {
    const { result } = setup();

    act(() => result.current.selectDayFromRow(3));
    expect(result.current.tab).toBe(3);
    expect(result.current.tabFocus).toEqual({ tab: 3, seq: 1 });
    act(() => result.current.selectDayFromRow(3));
    expect(result.current.tabFocus).toEqual({ tab: 3, seq: 2 });
  });

  it("clamps a tab that no longer exists", () => {
    const { result, rerender } = setup();
    act(() => result.current.changeTab(3));

    rerender({ itinerary: makeFxItinerary({ days: [], waypoints: [makeFxWaypoint("w", 1, 0)] }), wide: true });

    expect(result.current.tab).toBe(1);
  });
});

describe("usePublicMapState: selection and camera", () => {
  it("a pin press selects, reveals and asks the sheet for the medium snap, with a growing seq", () => {
    const { result } = setup();

    act(() => result.current.handlePinSelect("w-1-1"));
    expect(result.current.selectedId).toBe("w-1-1");
    expect(result.current.camera.kind).toBe("reveal");
    expect(result.current.sheetRequest).toEqual({ seq: 1, snap: "medium" });
    act(() => result.current.handlePinSelect("w-1-0"));
    expect(result.current.sheetRequest).toEqual({ seq: 2, snap: "medium" });
  });

  it("ignores a pin that is not in the itinerary", () => {
    const { result } = setup();
    const before = result.current.camera.seq;

    act(() => result.current.handlePinSelect("khong-co"));

    expect(result.current.selectedId).toBeNull();
    expect(result.current.camera.seq).toBe(before);
    expect(result.current.sheetRequest).toBeNull();
  });

  it("activating a waypoint selects it and moves the map only when the map is ready", () => {
    const { result } = setup();
    const start = result.current.camera.seq;

    act(() => result.current.handleActivate(WAYPOINT("w-1-0")));
    expect(result.current.selectedId).toBe("w-1-0");
    expect(result.current.camera.seq).toBe(start);

    act(() => result.current.setMapStatus("ready"));
    act(() => result.current.handleActivate(WAYPOINT("w-1-1")));
    expect(result.current.selectedId).toBe("w-1-1");
    expect(result.current.camera.kind).toBe("focus");
    expect(result.current.camera.seq).toBeGreaterThan(start);
  });

  it("clears a selection whose waypoint is gone", () => {
    const { result, rerender } = setup();
    act(() => result.current.handlePinSelect("w-1-0"));

    rerender({ itinerary: makeFxItinerary({ waypoints: [makeFxWaypoint("w-3-0", 3, 0)] }), wide: true });

    expect(result.current.selectedId).toBeNull();
  });

  it("clearSelection drops the selection", () => {
    const { result } = setup();
    act(() => result.current.handlePinSelect("w-1-0"));

    act(() => result.current.clearSelection());

    expect(result.current.selectedId).toBeNull();
  });
});

describe("usePublicMapState: map model", () => {
  it("labels pins with the day on Tổng quan only", () => {
    const { result } = setup();
    expect(result.current.pins.length).toBeGreaterThan(0);
    expect(result.current.pins.every((pin) => pin.labelDetail?.startsWith("Ngày "))).toBe(true);

    act(() => result.current.changeTab(1));

    expect(result.current.pins.every((pin) => pin.labelDetail === undefined)).toBe(true);
  });

  it("builds a route per day with points and reports an empty itinerary", () => {
    const { result } = setup();
    expect(result.current.routes.length).toBeGreaterThan(0);
    expect(result.current.empty).toBe(false);

    const empty = setup(makeFxItinerary({ days: [], waypoints: [] }));
    expect(empty.result.current.empty).toBe(true);
    expect(empty.result.current.pins).toHaveLength(0);
  });

  it("marks the row of the selected waypoint's day", () => {
    const { result } = setup();
    act(() => result.current.handlePinSelect("w-3-0"));

    expect(result.current.rowEmphasis(3)).toBe("selected");
    expect(result.current.rowEmphasis(1)).toBe("none");
  });

  it("hovering a day only has an effect when the layout is wide", () => {
    const wide = setup(makeFxItinerary(), true);
    act(() => wide.result.current.emphasizeDay(1));
    const wideDimmed = wide.result.current.pins.some((pin) => pin.state === "dimmed");

    const narrow = setup(makeFxItinerary(), false);
    act(() => narrow.result.current.emphasizeDay(1));
    const narrowDimmed = narrow.result.current.pins.some((pin) => pin.state === "dimmed");

    expect(wideDimmed).toBe(true);
    expect(narrowDimmed).toBe(false);
  });
});
