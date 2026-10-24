import { describe, expect, it } from 'vitest';
import {
  isFresh,
  PROACTIVE_LEAD_SEC,
  REFRESH_IF_BELOW_SEC,
  remainingSeconds,
  STALE_AT_SEC,
} from './token-freshness';

describe('Ngưỡng tươi token', () => {
  it('giữ đúng ba giá trị đã chốt', () => {
    expect(STALE_AT_SEC).toBe(30);
    expect(REFRESH_IF_BELOW_SEC).toBe(150);
    expect(PROACTIVE_LEAD_SEC).toBe(120);
  });

  it('hẹn trước hạn nhỏ hơn ngưỡng route refresh để route thật sự gọi BE', () => {
    expect(PROACTIVE_LEAD_SEC).toBeLessThan(REFRESH_IF_BELOW_SEC);
    expect(STALE_AT_SEC).toBeLessThan(PROACTIVE_LEAD_SEC);
  });
});

describe('remainingSeconds', () => {
  it.each([
    [1000, 400, 600],
    [1000, 1000, 0],
    [1000, 1100, -100],
  ] as const)('exp %i, now %i -> %i', (exp, now, expected) => {
    expect(remainingSeconds(exp, now)).toBe(expected);
  });
});

describe('isFresh', () => {
  it('đúng bằng ngưỡng là stale', () => {
    expect(isFresh(1000, 970, 30)).toBe(false);
  });

  it('hơn ngưỡng một giây là tươi', () => {
    expect(isFresh(1000, 969, 30)).toBe(true);
  });

  it.each([
    [1000, 1000, 30, false],
    [1000, 1500, 30, false],
    [1000, 0, 30, true],
    [1000, 850, 150, false],
    [1000, 849, 150, true],
    // minSec = 0: chỉ cần chưa hết hạn.
    [1000, 999, 0, true],
    [1000, 1000, 0, false],
  ] as const)('exp %i, now %i, min %i -> %s', (exp, now, min, expected) => {
    expect(isFresh(exp, now, min)).toBe(expected);
  });
});
