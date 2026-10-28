import { parseItineraryId } from '@tripory/shared-kernel';
import { describe, expect, it } from 'vitest';
import { ITINERARY_PAGE_SIZE, itineraryKeys } from './index';

const id = parseItineraryId('a1b2c3d4-0000-4000-8000-000000000001');
if (id === null) throw new Error('id mẫu phải hợp lệ');

describe('itineraryKeys', () => {
  it('khóa ghi chung của editor là ["itinerary","write",id]', () => {
    expect(itineraryKeys.write(id)).toEqual(['itinerary', 'write', id]);
  });

  it('mỗi status một khóa danh sách, cùng tiền tố lists()', () => {
    expect(itineraryKeys.list('draft')).toEqual(['itinerary', 'list', 'draft']);
    expect(itineraryKeys.list('all')).not.toEqual(itineraryKeys.list('published'));
    expect(itineraryKeys.list('published').slice(0, 2)).toEqual(itineraryKeys.lists());
  });

  it('chi tiết, xóa và gốc', () => {
    expect(itineraryKeys.detail(id)).toEqual(['itinerary', 'detail', id]);
    expect(itineraryKeys.remove()).toEqual(['itinerary', 'remove']);
    expect(itineraryKeys.all).toEqual(['itinerary']);
  });

  it('trang danh sách 12 mục (D-02)', () => {
    expect(ITINERARY_PAGE_SIZE).toBe(12);
  });
});
