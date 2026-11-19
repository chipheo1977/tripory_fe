import { describe, expect, it } from 'vitest';
import { canDeleteComment } from './permissions';
import { otherUserIdFixture, ownerIdFixture, userIdFixture } from './test-fixtures';
describe('canDeleteComment', () => {
  it('tác giả xóa được', () => {
    expect(canDeleteComment(userIdFixture, userIdFixture, ownerIdFixture)).toBe(true);
  });
  it('chủ lịch trình xóa được comment người khác', () => {
    expect(canDeleteComment(ownerIdFixture, userIdFixture, ownerIdFixture)).toBe(true);
  });
  it('người thứ ba không xóa được', () => {
    expect(canDeleteComment(otherUserIdFixture, userIdFixture, ownerIdFixture)).toBe(false);
  });
  it('khách không xóa được', () => {
    expect(canDeleteComment(null, userIdFixture, ownerIdFixture)).toBe(false);
  });
  it('khách không xóa được kể cả khi tác giả null', () => {
    expect(canDeleteComment(null, null, ownerIdFixture)).toBe(false);
  });
  it('tác giả null và người xem không phải chủ thì không', () => {
    expect(canDeleteComment(otherUserIdFixture, null, ownerIdFixture)).toBe(false);
  });
  it('tác giả null và người xem là chủ thì được', () => {
    expect(canDeleteComment(ownerIdFixture, null, ownerIdFixture)).toBe(true);
  });
});
