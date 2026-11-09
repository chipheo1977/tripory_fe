import { describe, expect, it } from 'vitest';
import { boundsContain, boundsOf, isDegenerate, VIETNAM_VIEW_BOUNDS } from './geo-bounds';
import type { GeoBounds, LngLat } from './geo-bounds';

describe('boundsOf', () => {
  it('trả null khi rỗng', () => {
    expect(boundsOf([])).toBeNull();
  });

  it('bao đúng các tọa độ', () => {
    const points: LngLat[] = [
      [108.2, 16.0],
      [107.6, 16.4],
      [108.3, 15.9],
    ];

    expect(boundsOf(points)).toEqual([
      [107.6, 15.9],
      [108.3, 16.4],
    ]);
  });

  it('bỏ tọa độ không hữu hạn', () => {
    expect(
      boundsOf([
        [Number.NaN, 10],
        [105, Number.POSITIVE_INFINITY],
        [106, 11],
      ]),
    ).toEqual([
      [106, 11],
      [106, 11],
    ]);
  });

  it('trả null khi mọi tọa độ đều không hữu hạn', () => {
    expect(boundsOf([[Number.NaN, Number.NaN]])).toBeNull();
  });
});

describe('boundsContain', () => {
  const bounds: GeoBounds = [
    [100, 10],
    [110, 20],
  ];

  it.each([
    [[105, 15], true],
    [[100, 10], true],
    [[110, 20], true],
    [[99.99, 15], false],
    [[105, 20.01], false],
  ] as const)('%j -> %s', (point, expected) => {
    expect(boundsContain(bounds, [point[0], point[1]])).toBe(expected);
  });
});

describe('isDegenerate', () => {
  it('đúng khi tây = đông và nam = bắc', () => {
    expect(
      isDegenerate([
        [105, 10],
        [105, 10],
      ]),
    ).toBe(true);
  });

  it('sai khi có độ rộng', () => {
    expect(
      isDegenerate([
        [105, 10],
        [105.1, 10],
      ]),
    ).toBe(false);
  });
});

describe('VIETNAM_VIEW_BOUNDS', () => {
  it('bao cả Việt Nam lẫn Biển Đông', () => {
    expect(boundsContain(VIETNAM_VIEW_BOUNDS, [114.36, 10.38])).toBe(true);
    expect(boundsContain(VIETNAM_VIEW_BOUNDS, [105.8, 21.0])).toBe(true);
  });
});
