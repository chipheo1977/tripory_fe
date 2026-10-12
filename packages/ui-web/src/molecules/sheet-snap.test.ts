import { sheetPeekMinPx, sheetSnapPoints } from '@tripory/design-tokens';
import { describe, expect, it } from 'vitest';
import { resolveSnapPoints, stepSnapPoint } from './sheet-snap';

describe('Sheet snap adapter', () => {
  it('giữ các hằng snap đã khóa trong design tokens', () => {
    expect(sheetSnapPoints).toEqual({ peek: 0.25, medium: 0.6, expanded: 0.92 });
    expect(sheetPeekMinPx).toBe(160);
  });

  it.each([
    [400, ['160px', 0.6, 0.92]],
    [1000, ['250px', 0.6, 0.92]],
  ] as const)('resolve viewport %ipx thành snap point Base UI hợp lệ', (viewportHeight, expected) => {
    expect(resolveSnapPoints(viewportHeight)).toEqual(expected);
  });

  it('mở rộng và thu gọn đúng một mức', () => {
    const points = resolveSnapPoints(1000);

    expect(stepSnapPoint(points, points[0], 'expand')).toBe(points[1]);
    expect(stepSnapPoint(points, points[1], 'expand')).toBe(points[2]);
    expect(stepSnapPoint(points, points[2], 'collapse')).toBe(points[1]);
    expect(stepSnapPoint(points, points[1], 'collapse')).toBe(points[0]);
  });

  it('giữ nguyên khi đã ở boundary', () => {
    const points = resolveSnapPoints(1000);

    expect(stepSnapPoint(points, points[2], 'expand')).toBe(points[2]);
    expect(stepSnapPoint(points, points[0], 'collapse')).toBe(points[0]);
  });
});
