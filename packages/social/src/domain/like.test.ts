import { describe, expect, it } from 'vitest';
import { toggleLike } from './like';
describe('toggleLike', () => {
  it('chưa like thành đã like, +1', () => {
    expect(toggleLike({ count: 12, liked: false })).toEqual({ count: 13, liked: true });
  });
  it('đã like thành bỏ like, −1', () => {
    expect(toggleLike({ count: 13, liked: true })).toEqual({ count: 12, liked: false });
  });
  it('dữ liệu lệch không cho số âm', () => {
    expect(toggleLike({ count: 0, liked: true })).toEqual({ count: 0, liked: false });
  });
  it('kết quả đã freeze', () => {
    expect(Object.isFrozen(toggleLike({ count: 1, liked: false }))).toBe(true);
  });
});
