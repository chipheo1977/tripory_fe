import { describe, expect, it } from 'vitest';
import { formatCalendarDateVi, parseCalendarDate } from './calendar-date';

describe('parseCalendarDate', () => {
  it.each([['2026-10-12'], ['2024-02-29'], ['2000-02-29'], ['2026-12-31'], ['2026-01-01']] as const)(
    'nhận ngày lịch hợp lệ: %j',
    (value) => {
      expect(parseCalendarDate(value)).toBe(value);
    },
  );

  it.each([
    ['2026-02-29', 'năm không nhuận'],
    ['1900-02-29', 'năm thế kỷ không nhuận'],
    ['2026-13-01', 'tháng 13'],
    ['2026-00-10', 'tháng 0'],
    ['2026-04-31', 'tháng 4 không có ngày 31'],
    ['2026-10-00', 'ngày 0'],
    ['2026-1-1', 'thiếu số 0 đệm'],
    ['', 'rỗng'],
    ['2026-10-12T00:00', 'có phần giờ'],
    [' 2026-10-12', 'khoảng trắng đầu'],
    ['12/10/2026', 'định dạng vi'],
  ] as const)('từ chối %j (%s)', (value) => {
    expect(parseCalendarDate(value)).toBeNull();
  });
});

describe('formatCalendarDateVi', () => {
  it('đổi YYYY-MM-DD sang DD/MM/YYYY, giữ nguyên số 0 đệm', () => {
    const date = parseCalendarDate('2026-10-12');
    if (date === null) throw new Error('ngày mẫu phải hợp lệ');
    expect(formatCalendarDateVi(date)).toBe('12/10/2026');

    const early = parseCalendarDate('2026-01-05');
    if (early === null) throw new Error('ngày mẫu phải hợp lệ');
    expect(formatCalendarDateVi(early)).toBe('05/01/2026');
  });
});
