import { describe, expect, it } from 'vitest';
import { parseAccessTokenClaims } from './access-token-claims';
import { jwtPayloadFixture, jwtPayloadShortFixture, userIdFixture } from './fixtures';

const URI_NAMEID = 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier';
const URI_EMAIL = 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress';
const OTHER_ID = '9c858901-8a57-4791-81fe-4c455b099bc9';

const withoutKeys = (source: object, ...keys: readonly string[]): Record<string, unknown> =>
  Object.fromEntries(Object.entries(source).filter(([name]) => !keys.includes(name)));

describe('parseAccessTokenClaims: payload thật của BE', () => {
  it('đọc claim URI dài và giữ nguyên dấu tiếng Việt', () => {
    expect(parseAccessTokenClaims(jwtPayloadFixture)).toEqual({
      userId: userIdFixture,
      email: 'a@b.vn',
      fullName: 'Nguyễn Văn Ánh',
      handle: 'a',
      exp: 1791890410,
    });
  });

  it('role dạng mảng vẫn parse được và bị bỏ qua', () => {
    const claims = parseAccessTokenClaims({
      ...jwtPayloadFixture,
      'http://schemas.microsoft.com/ws/2008/06/identity/claims/role': ['Traveler', 'Admin'],
    });

    expect(claims?.userId).toBe(userIdFixture);
    expect(claims).not.toHaveProperty('role');
  });

  it('chuẩn hóa id về chữ thường như parseUserId', () => {
    const claims = parseAccessTokenClaims({ ...jwtPayloadFixture, [URI_NAMEID]: userIdFixture.toUpperCase() });

    expect(claims?.userId).toBe(userIdFixture);
  });
});

describe('parseAccessTokenClaims: dạng ngắn', () => {
  it('nhận nameid, email, name, handle, exp', () => {
    expect(parseAccessTokenClaims(jwtPayloadShortFixture)).toEqual({
      userId: userIdFixture,
      email: 'a@b.vn',
      fullName: 'Nguyễn Văn Ánh',
      handle: 'a',
      exp: 1791890410,
    });
  });

  it('nhận sub thay cho nameid', () => {
    const payload = { ...withoutKeys(jwtPayloadShortFixture, 'nameid'), sub: userIdFixture };

    expect(parseAccessTokenClaims(payload)?.userId).toBe(userIdFixture);
  });

  it('URI ưu tiên hơn nameid và sub khi có cả hai', () => {
    const claims = parseAccessTokenClaims({
      [URI_NAMEID]: userIdFixture,
      [URI_EMAIL]: 'uri@b.vn',
      nameid: OTHER_ID,
      sub: OTHER_ID,
      email: 'short@b.vn',
      exp: 1791890410,
    });

    expect(claims?.userId).toBe(userIdFixture);
    expect(claims?.email).toBe('uri@b.vn');
  });

  it('nameid ưu tiên hơn sub', () => {
    const claims = parseAccessTokenClaims({ ...jwtPayloadShortFixture, nameid: userIdFixture, sub: OTHER_ID });

    expect(claims?.userId).toBe(userIdFixture);
  });
});

describe('parseAccessTokenClaims: trả null', () => {
  it.each([
    ['thiếu id', withoutKeys(jwtPayloadFixture, URI_NAMEID)],
    ['id không phải GUID', { ...jwtPayloadFixture, [URI_NAMEID]: 'khong-phai-guid' }],
    ['id rỗng', { ...jwtPayloadFixture, [URI_NAMEID]: '' }],
    ['thiếu email', withoutKeys(jwtPayloadFixture, URI_EMAIL)],
    ['email rỗng', { ...jwtPayloadFixture, [URI_EMAIL]: '' }],
    ['thiếu exp', withoutKeys(jwtPayloadFixture, 'exp')],
    ['exp bằng 0', { ...jwtPayloadFixture, exp: 0 }],
    ['exp âm', { ...jwtPayloadFixture, exp: -5 }],
    ['exp không nguyên', { ...jwtPayloadFixture, exp: 1791890410.5 }],
    ['exp là chuỗi', { ...jwtPayloadFixture, exp: '1791890410' }],
    ['payload rỗng', {}],
    ['payload null', null],
    ['payload undefined', undefined],
    ['payload là chuỗi', 'eyJhbGciOi'],
    ['payload là số', 42],
    ['payload là mảng', [jwtPayloadFixture]],
  ] as const)('%s', (_name, payload) => {
    expect(parseAccessTokenClaims(payload)).toBeNull();
  });
});

describe('parseAccessTokenClaims: trường tùy chọn', () => {
  it('name và handle thiếu thì thành chuỗi rỗng', () => {
    const claims = parseAccessTokenClaims(withoutKeys(jwtPayloadFixture, 'name', 'handle'));

    expect(claims).toMatchObject({ fullName: '', handle: '' });
  });
});
