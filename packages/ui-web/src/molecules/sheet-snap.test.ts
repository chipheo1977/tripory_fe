import { sheetPeekMinPx, sheetSnapPoints } from '@tripory/design-tokens';
import { describe, expect, it } from 'vitest';
import { isTopSnap, resolveSnapPoints } from './sheet-snap';

describe('Sheet snap adapter', () => {
  it('giữ các hằng snap đã khóa trong design tokens', () => {
    expect(sheetSnapPoints).toEqual({ peek: 0.25, medium: 0.6, expanded: 0.92 });
    expect(sheetPeekMinPx).toBe(160);
  });

  it.each([
    [400, ['160px', 0.6, '368px']],
    [1000, ['250px', 0.6, '920px']],
  ] as const)('resolve viewport %ipx thành snap point Base UI hợp lệ', (viewportHeight, expected) => {
    expect(resolveSnapPoints(viewportHeight)).toEqual(expected);
  });

  it.each([
    // [viewportHeight, insetTop, peek, medium, expanded]
    [844, 64, '211px', 0.6, '776.48px'],
    [844, undefined, '211px', 0.6, '776.48px'],
    [844, 0, '211px', 0.6, '776.48px'],
    [568, 108, '160px', 0.6, '460px'],
    // insetTop làm expanded nhỏ hơn medium và peek: kẹp bằng expanded
    [400, 300, '100px', '100px', '100px'],
  ] as const)('resolveSnapPoints(%i, %s) kẹp expanded theo header', (viewportHeight, insetTop, peek, medium, expanded) => {
    expect(resolveSnapPoints(viewportHeight, insetTop)).toEqual([peek, medium, expanded]);
  });
});

describe('isTopSnap', () => {
  it.each([
    ['bottom', 0, 3, false],
    ['bottom', 1, 3, false],
    ['bottom', 2, 3, true],
    ['left', 0, 0, true],
    ['right', 0, 0, true],
    ['left', 0, 3, true],
  ] as const)('isTopSnap(%s, %i, %i) = %s', (position, snapIndex, length, expected) => {
    expect(isTopSnap(position, snapIndex, length)).toBe(expected);
  });
});
