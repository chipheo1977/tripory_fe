import { describe, expect, it } from 'vitest';
import {
  addCoverImage,
  canAddCoverImage,
  coverSlots,
  COVER_IMAGE_LIMIT,
  focusTargetAfterRemove,
  galleryOf,
  removeCoverImage,
  selectCoverImage,
  type CoverGallery,
} from './cover-images';

const u = (n: number) => `https://img.example/${n}.jpg`;
const gallery = (count: number, selectedIndex: number | null): CoverGallery => ({
  images: Array.from({ length: count }, (_, n) => u(n + 1)),
  selectedIndex,
});

describe('galleryOf', () => {
  it('danh sách rỗng thì không chọn', () => {
    expect(galleryOf({ coverImages: [], coverImageUrl: null })).toEqual({ images: [], selectedIndex: null });
  });

  it('ảnh hiển thị thuộc danh sách thì đúng vị trí, không thuộc thì 0', () => {
    expect(galleryOf({ coverImages: [u(1), u(2)], coverImageUrl: u(2) }).selectedIndex).toBe(1);
    expect(galleryOf({ coverImages: [u(1), u(2)], coverImageUrl: u(9) }).selectedIndex).toBe(0);
    expect(galleryOf({ coverImages: [u(1), u(2)], coverImageUrl: null }).selectedIndex).toBe(0);
  });
});

describe('canAddCoverImage', () => {
  it.each(['', '   '])('%j là empty', (url) => {
    expect(canAddCoverImage(gallery(1, 0), url)).toBe('empty');
  });

  it('trùng (kể cả khoảng trắng thừa) là duplicate', () => {
    expect(canAddCoverImage(gallery(2, 0), `  ${u(1)} `)).toBe('duplicate');
  });

  it('đủ 5 là limit, ưu tiên hơn duplicate', () => {
    expect(COVER_IMAGE_LIMIT).toBe(5);
    expect(canAddCoverImage(gallery(5, 0), u(9))).toBe('limit');
    expect(canAddCoverImage(gallery(5, 0), u(1))).toBe('limit');
  });

  it('hợp lệ là ok', () => {
    expect(canAddCoverImage(gallery(2, 0), u(9))).toBe('ok');
  });
});

describe('addCoverImage', () => {
  it('vào danh sách rỗng thì chọn 0', () => {
    expect(addCoverImage(gallery(0, null), u(1))).toEqual({ images: [u(1)], selectedIndex: 0 });
  });

  it('vào danh sách có ảnh giữ ảnh đang chọn và trim URL', () => {
    expect(addCoverImage(gallery(2, 1), ` ${u(9)} `)).toEqual({ images: [u(1), u(2), u(9)], selectedIndex: 1 });
  });

  it('trùng hoặc đủ 5 trả đúng tham chiếu cũ', () => {
    const duplicate = gallery(2, 0);
    expect(addCoverImage(duplicate, u(1))).toBe(duplicate);
    const full = gallery(5, 2);
    expect(addCoverImage(full, u(9))).toBe(full);
  });

  it('không sửa đầu vào', () => {
    const input = gallery(1, 0);
    addCoverImage(input, u(9));
    expect(input.images).toEqual([u(1)]);
  });
});

describe('removeCoverImage', () => {
  it('xóa ảnh đang chọn (giữa) thì chọn 0', () => {
    expect(removeCoverImage(gallery(3, 1), 1)).toEqual({ images: [u(1), u(3)], selectedIndex: 0 });
  });

  it('xóa ảnh trước ảnh chọn thì selectedIndex - 1', () => {
    expect(removeCoverImage(gallery(3, 2), 0)).toEqual({ images: [u(2), u(3)], selectedIndex: 1 });
  });

  it('xóa ảnh sau ảnh chọn thì giữ', () => {
    expect(removeCoverImage(gallery(3, 0), 2)).toEqual({ images: [u(1), u(2)], selectedIndex: 0 });
  });

  it('xóa ảnh duy nhất thì rỗng và không chọn', () => {
    expect(removeCoverImage(gallery(1, 0), 0)).toEqual({ images: [], selectedIndex: null });
  });

  it.each([-1, 9, 1.5])('index %s ngoài khoảng trả đúng tham chiếu cũ', (index) => {
    const input = gallery(2, 0);
    expect(removeCoverImage(input, index)).toBe(input);
  });
});

describe('selectCoverImage', () => {
  it('index hợp lệ thì đổi, không hợp lệ hoặc trùng thì giữ tham chiếu', () => {
    const input = gallery(3, 0);
    expect(selectCoverImage(input, 2).selectedIndex).toBe(2);
    expect(selectCoverImage(input, 5)).toBe(input);
    expect(selectCoverImage(input, 0)).toBe(input);
  });
});

describe('coverSlots', () => {
  it.each([
    [0, { filled: 0, hasAddTile: true, emptyCount: 4 }],
    [1, { filled: 1, hasAddTile: true, emptyCount: 3 }],
    [3, { filled: 3, hasAddTile: true, emptyCount: 1 }],
    [4, { filled: 4, hasAddTile: true, emptyCount: 0 }],
    [5, { filled: 5, hasAddTile: false, emptyCount: 0 }],
  ])('coverSlots(%i)', (count, expected) => {
    expect(coverSlots(count)).toEqual(expected);
  });
});

describe('focusTargetAfterRemove', () => {
  it.each([
    [2, 3, { kind: 'remove', position: 2 }],
    [3, 2, { kind: 'remove', position: 2 }],
    [3, 3, { kind: 'remove', position: 3 }],
    [1, 0, { kind: 'add' }],
  ] as const)('(%i, %i)', (position, remaining, expected) => {
    expect(focusTargetAfterRemove(position, remaining)).toEqual(expected);
  });
});
