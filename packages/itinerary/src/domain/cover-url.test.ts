import { describe, expect, it } from 'vitest';

import { COVER_URL_MAX_LENGTH, isHttpsUrl, isValidCoverUrl, previewableCoverUrl } from './cover-url';

describe('isHttpsUrl', () => {
  it('chấp nhận https có host, kể cả HTTPS viết hoa', () => {
    expect(isHttpsUrl('https://example.com/a.jpg')).toBe(true);
    expect(isHttpsUrl('HTTPS://example.com')).toBe(true);
  });

  it('từ chối scheme khác, thiếu host, khoảng trắng và ký tự điều khiển', () => {
    expect(isHttpsUrl('http://example.com')).toBe(false);
    expect(isHttpsUrl('javascript:alert(1)')).toBe(false);
    expect(isHttpsUrl('https://')).toBe(false);
    expect(isHttpsUrl('https://?')).toBe(false);
    expect(isHttpsUrl('https:///a')).toBe(false);
    expect(isHttpsUrl('https://a b')).toBe(false);
    expect(isHttpsUrl('https://a\u0007b')).toBe(false);
    expect(isHttpsUrl('')).toBe(false);
  });
});

describe('isValidCoverUrl', () => {
  it('đo độ dài trên chuỗi đã trim', () => {
    const base = 'https://example.com/';
    const exact = base + 'a'.repeat(COVER_URL_MAX_LENGTH - base.length);
    expect(isValidCoverUrl(`  ${exact}  `)).toBe(true);
    expect(isValidCoverUrl(`${exact}a`)).toBe(false);
  });
});

describe('previewableCoverUrl', () => {
  it('trả bản đã trim khi hợp lệ, rỗng khi không', () => {
    expect(previewableCoverUrl('  https://example.com/a  ')).toBe('https://example.com/a');
    expect(previewableCoverUrl('https://?')).toBe('');
  });
});
