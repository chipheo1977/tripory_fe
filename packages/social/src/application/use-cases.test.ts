import { parseItineraryId } from '@tripory/shared-kernel';
import { describe, expect, it, vi } from 'vitest';
import { makeComment } from '../domain/test-fixtures';
import { makeSubmitComment } from './use-cases';
const itineraryId = (() => {
  const id = parseItineraryId('a1b2c3d4-0000-4000-8000-000000000001');
  if (id === null) throw new Error('id mẫu phải hợp lệ');
  return id;
})();
describe('makeSubmitComment', () => {
  it.each([
    ['', 'empty'],
    ['   \n', 'empty'],
    ['a'.repeat(501), 'too-long'],
  ])('nội dung %j trả lỗi %s và không gọi repository', async (raw, reason) => {
    const addComment = vi.fn();
    const result = await makeSubmitComment({ addComment })(itineraryId, raw);
    expect(result).toEqual({ ok: false, reason });
    expect(addComment).not.toHaveBeenCalled();
  });
  it('gửi bản đã trim đúng một lần và trả comment của repository', async () => {
    const comment = makeComment();
    const addComment = vi.fn().mockResolvedValue(comment);
    const result = await makeSubmitComment({ addComment })(itineraryId, '  Đẹp quá!  ');
    expect(addComment).toHaveBeenCalledTimes(1);
    expect(addComment).toHaveBeenCalledWith(itineraryId, 'Đẹp quá!');
    expect(result).toEqual({ ok: true, comment });
  });
  it('lỗi của repository lan ra nguyên vẹn', async () => {
    const error = new Error('mạng');
    const addComment = vi.fn().mockRejectedValue(error);
    await expect(makeSubmitComment({ addComment })(itineraryId, 'x')).rejects.toBe(error);
  });
});
