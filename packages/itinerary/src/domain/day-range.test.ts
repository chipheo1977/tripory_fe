import { describe, expect, it } from 'vitest';
import { buildDayRange, nextDayNumber, waypointsOfDay } from './day-range';
import { makeDay, makeItinerary, makeWaypoint } from './test-fixtures';

describe('buildDayRange', () => {
  it('vẽ đủ Ngày 1..max kể cả ngày thưa (D-28)', () => {
    const itinerary = makeItinerary({
      days: [makeDay(3, 'Bà Nà', 12.5), makeDay(1, 'Biển')],
      waypoints: [makeWaypoint('w1', 1, 0), makeWaypoint('w3', 3, 0)],
    });

    const range = buildDayRange(itinerary);

    expect(range.map((d) => d.dayNumber)).toEqual([1, 2, 3]);
    expect(range[1]).toEqual({ dayNumber: 2, subtitle: null, distanceKm: null, waypoints: [] });
    expect(range[0]?.subtitle).toBe('Biển');
    expect(range[2]).toMatchObject({ subtitle: 'Bà Nà', distanceKm: 12.5 });
  });

  it('tối thiểu một ngày khi chưa có gì', () => {
    const range = buildDayRange(makeItinerary());

    expect(range).toHaveLength(1);
    expect(range[0]).toEqual({ dayNumber: 1, subtitle: null, distanceKm: null, waypoints: [] });
  });

  it('kéo dải tới ngày chỉ có waypoint, không có bản ghi day', () => {
    const range = buildDayRange(makeItinerary({ waypoints: [makeWaypoint('w4', 4, 0)] }));

    expect(range.map((d) => d.dayNumber)).toEqual([1, 2, 3, 4]);
    expect(range[3]?.waypoints.map((w) => w.id)).toEqual(['w4']);
  });

  it('giữ thứ tự waypoint của đầu vào trong mỗi ngày', () => {
    const range = buildDayRange(
      makeItinerary({
        waypoints: [makeWaypoint('b', 1, 0), makeWaypoint('x', 2, 0), makeWaypoint('a', 1, 1)],
      }),
    );

    expect(range[0]?.waypoints.map((w) => w.id)).toEqual(['b', 'a']);
    expect(range[1]?.waypoints.map((w) => w.id)).toEqual(['x']);
  });
});

describe('nextDayNumber', () => {
  it('bằng độ dài dải ngày + 1 (D-27)', () => {
    const itinerary = makeItinerary({
      days: [makeDay(3), makeDay(1)],
      waypoints: [makeWaypoint('w1', 1, 0), makeWaypoint('w3', 3, 0)],
    });

    expect(nextDayNumber(itinerary)).toBe(4);
  });

  it('là 2 khi lịch trình trống', () => {
    expect(nextDayNumber(makeItinerary())).toBe(2);
  });
});

describe('waypointsOfDay', () => {
  it('chỉ lấy waypoint đúng ngày, giữ thứ tự', () => {
    const itinerary = makeItinerary({
      waypoints: [makeWaypoint('a', 1, 0), makeWaypoint('b', 2, 0), makeWaypoint('c', 1, 1)],
    });

    expect(waypointsOfDay(itinerary, 1).map((w) => w.id)).toEqual(['a', 'c']);
    expect(waypointsOfDay(itinerary, 5)).toEqual([]);
  });
});
