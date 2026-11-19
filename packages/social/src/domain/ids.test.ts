import { describe, expect, it } from 'vitest';
import { parseCommentId } from './ids';
describe('parseCommentId', () => {
  it('chuẩn hóa GUID hoa và có khoảng trắng về chữ thường', () => {
    expect(parseCommentId('  7C9E6679-7425-40DE-944B-E07FC1F90AE7 ')).toBe('7c9e6679-7425-40de-944b-e07fc1f90ae7');
  });
  it('giữ GUID chữ thường', () => {
    expect(parseCommentId('7c9e6679-7425-40de-944b-e07fc1f90ae7')).toBe('7c9e6679-7425-40de-944b-e07fc1f90ae7');
  });
  it.each(['', 'abc', '../x', '7c9e6679-7425-40de-944b-e07fc1f90ae'])('trả null với %j', (value) => {
    expect(parseCommentId(value)).toBeNull();
  });
});
