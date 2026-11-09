import { createWgs84Coordinate } from '@tripory/shared-kernel';
import { describe, expect, it } from 'vitest';
import { VIETNAM_VIEW_BOUNDS } from './geo-bounds';
import type { GeoBounds } from './geo-bounds';
import {
  buildDayRoutes,
  buildMapPins,
  countVisibleWaypoints,
  dayColorIndex,
  defaultEditorTab,
  fitTargetFor,
  summarizeDays,
} from './map-view';
import type { EditorTab, MapEmphasis } from './map-view';
import { makeDay, makeItinerary, makeWaypoint } from './test-fixtures';

const at = (longitude: number, latitude: number) => {
  const coordinate = createWgs84Coordinate({ latitude, longitude });
  if (coordinate === null) throw new Error('tọa độ mẫu phải hợp lệ');
  return coordinate;
};

const NONE: ReadonlySet<string> = new Set();
const emphasis = (tab: EditorTab, hoveredDay: number | null = null, selectedWaypointId: string | null = null): MapEmphasis => ({
  tab,
  hoveredDay,
  selectedWaypointId,
});

// Ngày 1: A, C (B chờ xóa ở một số ca); ngày 2: D, E, F.
const trip = () =>
  makeItinerary({
    waypoints: [
      makeWaypoint('A', 1, 0, { coordinate: at(108.0, 16.0) }),
      makeWaypoint('B', 1, 2, { coordinate: at(108.5, 16.5) }),
      makeWaypoint('C', 1, 1, { coordinate: at(108.2, 16.2) }),
      makeWaypoint('D', 2, 0, { coordinate: at(109.0, 12.0) }),
      makeWaypoint('E', 2, 1, { coordinate: at(109.2, 12.2) }),
      makeWaypoint('F', 2, 2, { coordinate: at(109.4, 12.4) }),
    ],
  });

describe('dayColorIndex', () => {
  it.each([
    [1, 1],
    [2, 2],
    [8, 8],
    [9, 1],
    [16, 8],
    [17, 1],
  ])('ngày %i -> màu %i', (day, color) => {
    expect(dayColorIndex(day)).toBe(color);
  });
});

describe('countVisibleWaypoints và defaultEditorTab', () => {
  it('lịch trình không có điểm mở ở Ngày 1', () => {
    const empty = makeItinerary();

    expect(countVisibleWaypoints(empty, NONE)).toBe(0);
    expect(defaultEditorTab(empty, NONE)).toBe(1);
  });

  it('mọi điểm đang chờ xóa thì coi như rỗng', () => {
    const two = makeItinerary({ waypoints: [makeWaypoint('A', 1, 0), makeWaypoint('B', 1, 1)] });

    expect(defaultEditorTab(two, new Set(['A', 'B']))).toBe(1);
  });

  it('có ít nhất một điểm hiển thị thì mở ở Tổng quan', () => {
    const one = makeItinerary({ waypoints: [makeWaypoint('A', 1, 0)] });

    expect(countVisibleWaypoints(one, NONE)).toBe(1);
    expect(defaultEditorTab(one, NONE)).toBe('overview');
    expect(defaultEditorTab(one, new Set(['A']))).toBe(1);
  });
});

describe('buildMapPins', () => {
  it('bỏ điểm chờ xóa, đánh số 1-based theo orderIndex và lấy [kinh độ, vĩ độ]', () => {
    const pins = buildMapPins(trip(), new Set(['B']), emphasis('overview'));
    const day1 = pins.filter((pin) => pin.dayNumber === 1);

    expect(day1.map((pin) => [pin.waypointId, pin.position])).toEqual([
      ['A', 1],
      ['C', 2],
    ]);
    expect(day1[0].coordinate).toEqual([108.0, 16.0]);
    expect(pins.map((pin) => pin.waypointId)).not.toContain('B');
  });

  it('gắn màu theo ngày', () => {
    const pins = buildMapPins(trip(), NONE, emphasis('overview'));

    expect(pins.find((pin) => pin.waypointId === 'D')?.colorIndex).toBe(2);
  });

  it.each([
    ['overview, không rê', emphasis('overview'), { 1: 'normal', 2: 'normal' }],
    ['overview, rê ngày 2', emphasis('overview', 2), { 1: 'dimmed', 2: 'normal' }],
    ['tab ngày 2', emphasis(2), { 1: 'dimmed', 2: 'normal' }],
    ['tab ngày 1', emphasis(1), { 1: 'normal', 2: 'dimmed' }],
  ] as const)('nhấn mạnh: %s', (_name, input, expected) => {
    const pins = buildMapPins(trip(), NONE, input);

    for (const pin of pins) {
      expect(pin.state, pin.waypointId).toBe(expected[pin.dayNumber as 1 | 2]);
    }
  });

  it('điểm đang chọn luôn là selected, kể cả ở overview và khi thuộc ngày mờ', () => {
    const atOverview = buildMapPins(trip(), NONE, emphasis('overview', null, 'D'));
    const dimmedDay = buildMapPins(trip(), NONE, emphasis(1, null, 'D'));

    expect(atOverview.find((pin) => pin.waypointId === 'D')?.state).toBe('selected');
    expect(dimmedDay.find((pin) => pin.waypointId === 'D')?.state).toBe('selected');
    expect(dimmedDay.find((pin) => pin.waypointId === 'E')?.state).toBe('dimmed');
  });

  it('stackOrder: mờ trước, thường sau, đang chọn trên cùng; trong cùng nhóm theo ngày rồi vị trí', () => {
    const pins = buildMapPins(trip(), NONE, emphasis(2, null, 'A'));
    const byStack = pins.toSorted((a, b) => a.stackOrder - b.stackOrder).map((pin) => pin.waypointId);

    // mờ: B, C (ngày 1, trừ A đang chọn); thường: D, E, F; chọn: A
    expect(byStack).toEqual(['C', 'B', 'D', 'E', 'F', 'A']);
    expect(pins.map((pin) => pin.stackOrder).toSorted((a, b) => a - b)).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('không tin thứ tự đầu vào', () => {
    const reversed = makeItinerary({ waypoints: trip().waypoints.toReversed() });

    expect(buildMapPins(reversed, NONE, emphasis('overview')).map((pin) => pin.waypointId)).toEqual([
      'A',
      'C',
      'B',
      'D',
      'E',
      'F',
    ]);
  });
});

describe('buildDayRoutes', () => {
  it('ngày một điểm không có đường', () => {
    const single = makeItinerary({ waypoints: [makeWaypoint('A', 1, 0)] });

    expect(buildDayRoutes(single, NONE, emphasis('overview'))).toEqual([]);
  });

  it('ngày chỉ còn một điểm sau khi bỏ điểm chờ xóa không có đường', () => {
    const routes = buildDayRoutes(trip(), new Set(['B', 'C']), emphasis('overview'));

    expect(routes.map((route) => route.dayNumber)).toEqual([2]);
  });

  it('mỗi ngày một đường, không nối C với D', () => {
    const routes = buildDayRoutes(trip(), new Set(['B']), emphasis('overview'));

    expect(routes.map((route) => [route.dayNumber, route.coordinates.length])).toEqual([
      [1, 2],
      [2, 3],
    ]);
    expect(routes[1].coordinates).toEqual([
      [109.0, 12.0],
      [109.2, 12.2],
      [109.4, 12.4],
    ]);
    expect(routes[0].coordinates).toEqual([
      [108.0, 16.0],
      [108.2, 16.2],
    ]);
  });

  it.each([
    ['overview, không rê', emphasis('overview'), { 1: [false, 1], 2: [false, 1] }],
    ['overview, rê ngày 2', emphasis('overview', 2), { 1: [true, 0], 2: [false, 2] }],
    ['tab ngày 1', emphasis(1), { 1: [false, 2], 2: [true, 0] }],
  ] as const)('dimmed và sortKey: %s', (_name, input, expected) => {
    const routes = buildDayRoutes(trip(), NONE, input);

    for (const route of routes) {
      const [dimmed, sortKey] = expected[route.dayNumber as 1 | 2];
      expect([route.dayNumber, route.dimmed, route.sortKey]).toEqual([route.dayNumber, dimmed, sortKey]);
    }
  });

  it('gắn màu theo ngày', () => {
    expect(buildDayRoutes(trip(), NONE, emphasis('overview')).map((route) => route.colorIndex)).toEqual([1, 2]);
  });
});

describe('fitTargetFor', () => {
  const FALLBACK: GeoBounds = [
    [105, 20],
    [106, 21],
  ];

  it('overview bao mọi điểm', () => {
    expect(fitTargetFor(trip(), NONE, 'overview', null)).toEqual({
      kind: 'bounds',
      bounds: [
        [108.0, 12.0],
        [109.4, 16.5],
      ],
    });
  });

  it('tab ngày bao điểm của ngày đó', () => {
    expect(fitTargetFor(trip(), NONE, 2, null)).toEqual({
      kind: 'bounds',
      bounds: [
        [109.0, 12.0],
        [109.4, 12.4],
      ],
    });
  });

  it('ngày trống mà lịch trình có điểm thì canh mọi điểm', () => {
    expect(fitTargetFor(trip(), NONE, 3, null)).toEqual(fitTargetFor(trip(), NONE, 'overview', null));
  });

  it('điểm chờ xóa không tính', () => {
    expect(fitTargetFor(trip(), new Set(['D', 'E', 'F']), 2, null)).toEqual({
      kind: 'bounds',
      bounds: [
        [108.0, 16.0],
        [108.5, 16.5],
      ],
    });
  });

  it('một điểm thì canh về điểm', () => {
    const one = makeItinerary({ waypoints: [makeWaypoint('A', 1, 0, { coordinate: at(108.0, 16.0) })] });

    expect(fitTargetFor(one, NONE, 1, null)).toEqual({ kind: 'point', center: [108.0, 16.0] });
  });

  it('hai điểm trùng tọa độ thì canh về điểm', () => {
    const same = makeItinerary({
      waypoints: [
        makeWaypoint('A', 1, 0, { coordinate: at(108.0, 16.0) }),
        makeWaypoint('B', 1, 1, { coordinate: at(108.0, 16.0) }),
      ],
    });

    expect(fitTargetFor(same, NONE, 'overview', null)).toEqual({ kind: 'point', center: [108.0, 16.0] });
  });

  it('không có điểm thì dùng khung tỉnh', () => {
    expect(fitTargetFor(makeItinerary(), NONE, 'overview', FALLBACK)).toEqual({ kind: 'bounds', bounds: FALLBACK });
  });

  it('không có điểm và không có tỉnh thì dùng khung Việt Nam', () => {
    expect(fitTargetFor(makeItinerary(), NONE, 1, null)).toEqual({ kind: 'bounds', bounds: VIETNAM_VIEW_BOUNDS });
  });

  it('mọi điểm đang chờ xóa thì rơi về khung tỉnh', () => {
    const one = makeItinerary({ waypoints: [makeWaypoint('A', 1, 0)] });

    expect(fitTargetFor(one, new Set(['A']), 'overview', FALLBACK)).toEqual({ kind: 'bounds', bounds: FALLBACK });
  });
});

describe('summarizeDays', () => {
  it('trả đủ dải Ngày 1..max kể cả ngày thưa', () => {
    const sparse = makeItinerary({
      days: [makeDay(1, 'Đến nơi', 4.5), makeDay(3, null, null)],
      waypoints: [makeWaypoint('A', 1, 0), makeWaypoint('B', 2, 0), makeWaypoint('C', 2, 1)],
    });

    expect(summarizeDays(sparse, NONE)).toEqual([
      { dayNumber: 1, subtitle: 'Đến nơi', waypointCount: 1, distanceKm: 4.5 },
      { dayNumber: 2, subtitle: null, waypointCount: 2, distanceKm: null },
      { dayNumber: 3, subtitle: null, waypointCount: 0, distanceKm: null },
    ]);
  });

  it('không đếm điểm đang chờ xóa', () => {
    const summaries = summarizeDays(trip(), new Set(['A', 'D']));

    expect(summaries.map((day) => day.waypointCount)).toEqual([2, 2]);
  });

  it('lịch trình rỗng vẫn có Ngày 1', () => {
    expect(summarizeDays(makeItinerary(), NONE)).toEqual([
      { dayNumber: 1, subtitle: null, waypointCount: 0, distanceKm: null },
    ]);
  });
});
