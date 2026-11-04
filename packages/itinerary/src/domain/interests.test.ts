import { describe, expect, it } from 'vitest';
import { interestLabel, INTERESTS, isInterestCode, normalizeInterests } from './interests';

describe('INTERESTS', () => {
  it('đủ 7 nhãn đúng thứ tự D-70', () => {
    expect(INTERESTS.map((interest) => interest.label)).toEqual([
      'Lịch sử & Văn hóa',
      'Thiên nhiên',
      'Mua sắm',
      'Ẩm thực & Đồ uống',
      'Giải trí',
      'Sức khỏe',
      'Khác',
    ]);
  });

  it('mã khớp hợp đồng BE', () => {
    expect(INTERESTS.map((interest) => interest.code)).toEqual([
      'history-culture',
      'nature',
      'shopping',
      'food-drink',
      'entertainment',
      'wellness',
      'other',
    ]);
  });
});

describe('normalizeInterests', () => {
  it('bỏ mã lạ, bỏ trùng và sắp theo danh mục', () => {
    expect(normalizeInterests(['shopping', 'nature', 'nature', 'zzz'])).toEqual(['nature', 'shopping']);
  });

  it('mảng rỗng giữ rỗng', () => {
    expect(normalizeInterests([])).toEqual([]);
  });
});

describe('isInterestCode / interestLabel', () => {
  it('phân biệt hoa thường', () => {
    expect(isInterestCode('nature')).toBe(true);
    expect(isInterestCode('Nature')).toBe(false);
  });

  it('trả nhãn tiếng Việt theo mã', () => {
    expect(interestLabel('food-drink')).toBe('Ẩm thực & Đồ uống');
  });
});
