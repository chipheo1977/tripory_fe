import { describe, expect, it } from 'vitest';
import {
  clampDayCount,
  DAY_COUNT_DEFAULT,
  DAY_COUNT_MAX,
  DAY_COUNT_MIN,
  isValidDayCount,
} from './day-count';

describe('day count', () => {
  it('hằng số theo D-73', () => {
    expect([DAY_COUNT_MIN, DAY_COUNT_MAX, DAY_COUNT_DEFAULT]).toEqual([1, 30, 3]);
  });

  it.each([
    [0, 1],
    [1, 1],
    [30, 30],
    [31, 30],
    [45, 30],
    [-5, 1],
    [2.7, 2],
    [Number.NaN, 3],
    [Number.POSITIVE_INFINITY, 3],
  ])('clampDayCount(%s) = %s', (input, expected) => {
    expect(clampDayCount(input)).toBe(expected);
  });

  it.each([
    [1, true],
    [30, true],
    [0, false],
    [31, false],
    [1.5, false],
    [Number.NaN, false],
  ])('isValidDayCount(%s) = %s', (input, expected) => {
    expect(isValidDayCount(input)).toBe(expected);
  });
});
