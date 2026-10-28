import { describe, expect, it } from 'vitest';
import type { Itinerary } from './itinerary';
import { makeDay, makeItinerary, makeWaypoint } from './test-fixtures';
import {
  appendWaypoint,
  applyDayOrder,
  isSameOrder,
  isValidDayOrder,
  moveItem,
  withDay,
  withDaySubtitle,
  withoutWaypoint,
} from './updates';

const idsOfDay = (itinerary: Itinerary, dayNumber: number): string[] =>
  itinerary.waypoints.filter((w) => w.dayNumber === dayNumber).map((w) => w.id);

const orderOfDay = (itinerary: Itinerary, dayNumber: number): number[] =>
  itinerary.waypoints.filter((w) => w.dayNumber === dayNumber).map((w) => w.orderIndex);

// Ngày 1 có w0,w1,w2; ngày 2 có x0,x1.
const sample = (): Itinerary =>
  makeItinerary({
    days: [makeDay(1, 'Biển'), makeDay(2)],
    waypoints: [
      makeWaypoint('w0', 1, 0),
      makeWaypoint('w1', 1, 1),
      makeWaypoint('w2', 1, 2),
      makeWaypoint('x0', 2, 0),
      makeWaypoint('x1', 2, 1),
    ],
  });

describe('moveItem', () => {
  it('chuyển phần tử từ đầu xuống cuối', () => {
    expect(moveItem(['a', 'b', 'c'], 0, 2)).toEqual(['b', 'c', 'a']);
  });

  it('chuyển phần tử từ cuối lên đầu', () => {
    expect(moveItem(['a', 'b', 'c'], 2, 0)).toEqual(['c', 'a', 'b']);
  });

  it.each([
    [-1, 1],
    [0, 3],
    [3, 0],
    [1, -1],
  ] as const)('giữ nguyên bản sao khi from=%i, to=%i nằm ngoài khoảng', (from, to) => {
    const input = ['a', 'b', 'c'];
    const result = moveItem(input, from, to);

    expect(result).toEqual(['a', 'b', 'c']);
    expect(result).not.toBe(input);
  });

  it('không sửa mảng đầu vào', () => {
    const input = Object.freeze(['a', 'b', 'c']);

    expect(() => moveItem(input, 0, 2)).not.toThrow();
    expect(input).toEqual(['a', 'b', 'c']);
  });
});

describe('isSameOrder', () => {
  it('true khi hai mảng cùng phần tử cùng thứ tự', () => {
    expect(isSameOrder(['a', 'b'], ['a', 'b'])).toBe(true);
    expect(isSameOrder([], [])).toBe(true);
  });

  it.each([
    [['a', 'b'], ['b', 'a']],
    [['a', 'b'], ['a']],
    [['a'], ['a', 'b']],
  ] as const)('false khi khác thứ tự hoặc độ dài: %j vs %j', (a, b) => {
    expect(isSameOrder(a, b)).toBe(false);
  });
});

describe('isValidDayOrder (T-04-13)', () => {
  const itinerary = sample();

  it('true khi là hoán vị đúng tập id của ngày', () => {
    expect(isValidDayOrder(itinerary, 1, ['w2', 'w0', 'w1'])).toBe(true);
    expect(isValidDayOrder(itinerary, 1, ['w0', 'w1', 'w2'])).toBe(true);
  });

  it.each([
    ['rỗng', []],
    ['thiếu id', ['w0', 'w1']],
    ['thừa id', ['w0', 'w1', 'w2', 'x0']],
    ['trùng id', ['w0', 'w0', 'w1']],
    ['id của ngày khác', ['w0', 'w1', 'x0']],
    ['id lạ', ['w0', 'w1', 'zzz']],
  ] as const)('false khi %s', (ten, ids) => {
    expect(isValidDayOrder(itinerary, 1, ids), ten).toBe(false);
  });

  it('false với ngày không có waypoint', () => {
    expect(isValidDayOrder(itinerary, 9, [])).toBe(false);
    expect(isValidDayOrder(itinerary, 9, ['w0'])).toBe(false);
  });
});

describe('applyDayOrder', () => {
  it('xếp waypoint của ngày theo thứ tự mới, đánh lại orderIndex 0..n-1', () => {
    const result = applyDayOrder(sample(), 1, ['w2', 'w0', 'w1']);

    expect(idsOfDay(result, 1)).toEqual(['w2', 'w0', 'w1']);
    expect(orderOfDay(result, 1)).toEqual([0, 1, 2]);
  });

  it('giữ nguyên các ngày khác', () => {
    const before = sample();
    const result = applyDayOrder(before, 1, ['w2', 'w1', 'w0']);

    expect(idsOfDay(result, 2)).toEqual(['x0', 'x1']);
    expect(orderOfDay(result, 2)).toEqual([0, 1]);
    expect(result.waypoints.filter((w) => w.dayNumber === 2)).toEqual(before.waypoints.filter((w) => w.dayNumber === 2));
  });

  it('trả bản mới frozen và không sửa đầu vào', () => {
    const before = sample();
    const snapshot = JSON.stringify(before);
    const result = applyDayOrder(before, 1, ['w1', 'w2', 'w0']);

    expect(result).not.toBe(before);
    expect(JSON.stringify(before)).toBe(snapshot);
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.waypoints)).toBe(true);
    expect(result.waypoints.every((w) => Object.isFrozen(w))).toBe(true);
  });

  it('bỏ qua thứ tự không hợp lệ, trả lịch trình không đổi', () => {
    const before = sample();

    expect(applyDayOrder(before, 1, ['w0', 'w1'])).toBe(before);
  });
});

describe('withoutWaypoint', () => {
  it('bỏ waypoint và đánh lại orderIndex của ngày đó', () => {
    const result = withoutWaypoint(sample(), 'w1');

    expect(idsOfDay(result, 1)).toEqual(['w0', 'w2']);
    expect(orderOfDay(result, 1)).toEqual([0, 1]);
    expect(idsOfDay(result, 2)).toEqual(['x0', 'x1']);
  });

  it('trả lịch trình không đổi khi id không tồn tại', () => {
    const before = sample();

    expect(withoutWaypoint(before, 'khong-co')).toBe(before);
  });

  it('trả bản mới frozen và không sửa đầu vào', () => {
    const before = sample();
    const snapshot = JSON.stringify(before);
    const result = withoutWaypoint(before, 'x0');

    expect(JSON.stringify(before)).toBe(snapshot);
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.waypoints)).toBe(true);
  });
});

describe('appendWaypoint', () => {
  it('thêm vào cuối ngày với orderIndex bằng số điểm hiện có', () => {
    const result = appendWaypoint(sample(), makeWaypoint('w3', 1, 99));

    expect(idsOfDay(result, 1)).toEqual(['w0', 'w1', 'w2', 'w3']);
    expect(orderOfDay(result, 1)).toEqual([0, 1, 2, 3]);
  });

  it('thêm vào ngày chưa có waypoint', () => {
    const result = appendWaypoint(sample(), makeWaypoint('y0', 5, 7));

    expect(idsOfDay(result, 5)).toEqual(['y0']);
    expect(orderOfDay(result, 5)).toEqual([0]);
  });

  it('trả bản mới frozen và không sửa đầu vào', () => {
    const before = sample();
    const snapshot = JSON.stringify(before);
    const result = appendWaypoint(before, makeWaypoint('w3', 1, 0));

    expect(JSON.stringify(before)).toBe(snapshot);
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.waypoints)).toBe(true);
    expect(result.waypoints.every((w) => Object.isFrozen(w))).toBe(true);
  });
});

describe('withDaySubtitle', () => {
  it('sửa phụ đề của ngày đã có', () => {
    const result = withDaySubtitle(sample(), 1, 'Ăn hải sản');

    expect(result.days.find((d) => d.dayNumber === 1)?.subtitle).toBe('Ăn hải sản');
  });

  it('tạo bản ghi day khi ngày chưa có, giữ days theo dayNumber', () => {
    const result = withDaySubtitle(sample(), 4, 'Bà Nà');

    expect(result.days.map((d) => d.dayNumber)).toEqual([1, 2, 4]);
    expect(result.days.find((d) => d.dayNumber === 4)).toEqual({ dayNumber: 4, subtitle: 'Bà Nà', distanceKm: null });
  });

  it.each([[''], ['   ']] as const)('phụ đề rỗng %j thành null', (subtitle) => {
    const result = withDaySubtitle(sample(), 1, subtitle);

    expect(result.days.find((d) => d.dayNumber === 1)?.subtitle).toBeNull();
  });

  it('cắt khoảng trắng hai đầu như BE', () => {
    const result = withDaySubtitle(sample(), 1, '  Biển  ');

    expect(result.days.find((d) => d.dayNumber === 1)?.subtitle).toBe('Biển');
  });

  it('giữ distanceKm của ngày và không sửa đầu vào', () => {
    const before = makeItinerary({ days: [makeDay(1, 'a', 3.5)] });
    const result = withDaySubtitle(before, 1, 'b');

    expect(result.days[0]).toEqual({ dayNumber: 1, subtitle: 'b', distanceKm: 3.5 });
    expect(before.days[0]?.subtitle).toBe('a');
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.days)).toBe(true);
  });
});

describe('withDay', () => {
  it('thêm day {n, null, null} khi chưa có, giữ days theo dayNumber', () => {
    const result = withDay(sample(), 5);

    expect(result.days.map((d) => d.dayNumber)).toEqual([1, 2, 5]);
    expect(result.days.find((d) => d.dayNumber === 5)).toEqual({ dayNumber: 5, subtitle: null, distanceKm: null });
  });

  it('chèn đúng chỗ khi dayNumber nhỏ hơn ngày cuối', () => {
    const result = withDay(makeItinerary({ days: [makeDay(1), makeDay(4)] }), 3);

    expect(result.days.map((d) => d.dayNumber)).toEqual([1, 3, 4]);
  });

  it('trả lịch trình không đổi khi ngày đã có', () => {
    const before = sample();

    expect(withDay(before, 2)).toBe(before);
  });

  it('trả bản mới frozen và không sửa đầu vào', () => {
    const before = sample();
    const result = withDay(before, 3);

    expect(before.days).toHaveLength(2);
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.days)).toBe(true);
  });
});
