import { describe, expect, it } from 'vitest';
import { STATUS_FILTERS, parseStatusFilter } from './itinerary';

describe('parseStatusFilter', () => {
  it.each([
    ['draft', 'draft'],
    ['published', 'published'],
    ['all', 'all'],
  ] as const)('giữ nguyên giá trị hợp lệ %j', (raw, expected) => {
    expect(parseStatusFilter(raw)).toBe(expected);
  });

  it.each([[null], [undefined], [''], ['DRAFT'], ['x'], [' draft']] as const)(
    'rơi về "all" với giá trị lạ hoặc rỗng: %j',
    (raw) => {
      expect(parseStatusFilter(raw)).toBe('all');
    },
  );
});

describe('STATUS_FILTERS', () => {
  it('liệt kê đúng ba bộ lọc theo thứ tự hiển thị', () => {
    expect(STATUS_FILTERS).toEqual(['all', 'draft', 'published']);
  });
});
