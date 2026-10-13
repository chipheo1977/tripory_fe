import { describe, expect, it } from 'vitest';
import { createWgs84Coordinate, isWgs84Coordinate } from './geo';

describe('Wgs84Coordinate', () => {
  it.each([
    [90, 180],
    [-90, -180],
    [0, 0],
    [10.762622, 106.660172],
  ] as const)('chấp nhận lat %d, lng %d và giữ nguyên giá trị', (latitude, longitude) => {
    expect(createWgs84Coordinate({ latitude, longitude })).toEqual({ latitude, longitude });
  });

  it.each([
    [90.0001, 0],
    [-90.0001, 0],
    [0, 180.0001],
    [0, -180.0001],
    [Number.NaN, 0],
    [0, Number.NaN],
    [Number.POSITIVE_INFINITY, 0],
    [0, Number.POSITIVE_INFINITY],
    [Number.NEGATIVE_INFINITY, 0],
    [0, Number.NEGATIVE_INFINITY],
  ] as const)('trả null với lat %d, lng %d', (latitude, longitude) => {
    expect(createWgs84Coordinate({ latitude, longitude })).toBeNull();
  });

  it('trả object frozen, không dùng lại object đầu vào', () => {
    const input = { latitude: 1, longitude: 2 };
    const coordinate = createWgs84Coordinate(input);

    expect(Object.isFrozen(coordinate)).toBe(true);
    expect(coordinate).not.toBe(input);
  });

  it('nhận diện tọa độ hợp lệ', () => {
    expect(isWgs84Coordinate({ latitude: 1, longitude: 2 })).toBe(true);
  });

  it.each([
    [null],
    ['1,2'],
    [{ latitude: '1', longitude: 2 }],
    [{ latitude: 91, longitude: 0 }],
    [{ lat: 1, lng: 2 }],
  ] as const)('không nhận diện nhầm giá trị %j', (value) => {
    expect(isWgs84Coordinate(value)).toBe(false);
  });
});
