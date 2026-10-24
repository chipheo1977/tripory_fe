import { describe, expect, it } from 'vitest';
import { toSafeNextPath } from './safe-next-path';

describe('toSafeNextPath: chấp nhận path nội bộ', () => {
  it.each([
    ['/'],
    ['/itineraries/mine'],
    ['/itineraries/mine?tab=draft#x'],
    ['/settings/password'],
    // Đã mã hóa phần trăm nên trình duyệt coi là một đoạn path, không phải host.
    ['/%2F%2Fevil.com'],
    ['/itineraries/3f2504e0-4f89-11d3-9a0c-0305e82c3301/edit'],
    // Chỉ chặn đúng /login, /register và con của chúng; tiền tố dài hơn là route khác.
    ['/loginfoo'],
    ['/registered'],
    ['/apix'],
  ] as const)('giữ nguyên: "%s"', (raw) => {
    expect(toSafeNextPath(raw)).toBe(raw);
  });

  it('giữ nguyên chuỗi dài đúng 2048 ký tự', () => {
    const raw = `/${'a'.repeat(2047)}`;

    expect(raw).toHaveLength(2048);
    expect(toSafeNextPath(raw)).toBe(raw);
  });
});

describe('toSafeNextPath: từ chối đầu vào không phải string hoặc rỗng', () => {
  it.each([[null], [undefined], ['']] as const)('trả null với %j', (raw) => {
    expect(toSafeNextPath(raw)).toBeNull();
  });

  it('trả null với giá trị không phải string dù lọt qua kiểu', () => {
    expect(toSafeNextPath(42 as unknown as string)).toBeNull();
    expect(toSafeNextPath({} as unknown as string)).toBeNull();
  });
});

describe('toSafeNextPath: chặn open redirect (T-03-06)', () => {
  it.each([
    ['//evil.com'],
    ['///evil.com'],
    ['/\\evil.com'],
    ['/\t/evil.com'],
    ['/\n/evil.com'],
    ['/\r/evil.com'],
    ['https://evil.com'],
    ['http://evil.com/x'],
    ['javascript:alert(1)'],
    ['data:text/html,x'],
    ['evil.com'],
    ['itineraries/mine'],
    ['?next=/x'],
    ['#x'],
    ['/a\\b'],
    ['/a b'],
    ['/a\u0000b'],
    ['/a\u007fb'],
  ] as const)('trả null: %j', (raw) => {
    expect(toSafeNextPath(raw)).toBeNull();
  });

  it('trả null với chuỗi dài hơn 2048 ký tự', () => {
    expect(toSafeNextPath(`/${'a'.repeat(2048)}`)).toBeNull();
  });
});

describe('toSafeNextPath: chặn vòng lặp chuyển trang và route nội bộ (T-03-07)', () => {
  it.each([
    ['/login'],
    ['/login?next=/x'],
    ['/login#x'],
    ['/login/'],
    ['/login/x'],
    ['/register'],
    ['/register?next=/itineraries/mine'],
    ['/register/x'],
    ['/api'],
    ['/api?x=1'],
    ['/api/bff/users'],
    ['/api/auth/refresh'],
    ['/_next/static/x'],
  ] as const)('trả null: %j', (raw) => {
    expect(toSafeNextPath(raw)).toBeNull();
  });
});
