import { describe, expect, it } from 'vitest';
import { checkCommentContent, trimmedLength } from './comment-content';
describe('checkCommentContent', () => {
  it.each(['', '   ', '\n\t '])('rỗng với %j', (raw) => {
    expect(checkCommentContent(raw)).toEqual({ ok: false, reason: 'empty' });
  });
  it('500 ký tự hợp lệ', () => {
    const raw = 'a'.repeat(500);
    expect(checkCommentContent(raw)).toEqual({ ok: true, content: raw });
  });
  it('501 ký tự quá dài', () => {
    expect(checkCommentContent('a'.repeat(501))).toEqual({ ok: false, reason: 'too-long' });
  });
  it('khoảng trắng hai đầu không tính', () => {
    const body = 'a'.repeat(500);
    expect(checkCommentContent(`     ${body}     `)).toEqual({ ok: true, content: body });
  });
  it('trả nội dung đã trim và giữ xuống dòng giữa chữ', () => {
    expect(checkCommentContent('  Đẹp quá!\nMình sẽ đi thử.  ')).toEqual({ ok: true, content: 'Đẹp quá!\nMình sẽ đi thử.' });
  });
  it('đếm theo length UTF-16: 250 emoji hợp lệ', () => {
    expect(checkCommentContent('😀'.repeat(250)).ok).toBe(true);
  });
  it('đếm theo length UTF-16: 251 emoji quá dài', () => {
    expect(checkCommentContent('😀'.repeat(251))).toEqual({ ok: false, reason: 'too-long' });
  });
  it('kết quả đã freeze', () => {
    expect(Object.isFrozen(checkCommentContent('x'))).toBe(true);
  });
});
describe('trimmedLength', () => {
  it('đếm sau trim', () => {
    expect(trimmedLength('  abc \n')).toBe(3);
  });
  it('rỗng là 0', () => {
    expect(trimmedLength('   ')).toBe(0);
  });
});
