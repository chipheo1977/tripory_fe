import { describe, expect, it } from 'vitest';
import {
  CHANGE_PASSWORD_RULES,
  REGISTER_PASSWORD_RULES,
  evaluatePasswordRules,
  type PasswordRuleId,
} from './password-rules';

const ids = (rules: readonly { id: PasswordRuleId }[]) => rules.map((rule) => rule.id);

const metOf = (rules: Parameters<typeof evaluatePasswordRules>[0], id: PasswordRuleId, pw: string, current?: string) =>
  evaluatePasswordRules(rules, pw, current).find((result) => result.id === id)?.met;

describe('Bộ rule theo validator BE', () => {
  it('đăng ký chỉ có minLength 8 (D-27)', () => {
    expect(REGISTER_PASSWORD_RULES).toHaveLength(1);
    expect(REGISTER_PASSWORD_RULES[0]).toMatchObject({ id: 'minLength', min: 8 });
  });

  it('đổi mật khẩu có đúng 6 mục theo thứ tự (D-34)', () => {
    expect(CHANGE_PASSWORD_RULES).toHaveLength(6);
    expect(ids(CHANGE_PASSWORD_RULES)).toEqual([
      'minLength',
      'uppercase',
      'lowercase',
      'digit',
      'special',
      'differentFromCurrent',
    ]);
    expect(CHANGE_PASSWORD_RULES[0]).toMatchObject({ min: 8 });
  });
});

describe('evaluatePasswordRules', () => {
  it('trả kết quả cùng thứ tự với bộ rule, mang theo id và min', () => {
    const results = evaluatePasswordRules(CHANGE_PASSWORD_RULES, 'Abcdef1!', 'cu');

    expect(ids(results)).toEqual(ids(CHANGE_PASSWORD_RULES));
    expect(results[0]).toEqual({ id: 'minLength', min: 8, met: true });
    expect(results.every((result) => result.met)).toBe(true);
  });

  it('báo từng mục chưa đạt khi gõ dở', () => {
    const results = evaluatePasswordRules(CHANGE_PASSWORD_RULES, 'abc', 'cu');

    expect(results.map((result) => [result.id, result.met])).toEqual([
      ['minLength', false],
      ['uppercase', false],
      ['lowercase', true],
      ['digit', false],
      ['special', false],
      ['differentFromCurrent', true],
    ]);
  });

  it('mật khẩu rỗng không đạt mục nào', () => {
    const results = evaluatePasswordRules(CHANGE_PASSWORD_RULES, '', 'cu');

    expect(results.every((result) => !result.met)).toBe(true);
  });

  it('bộ rule đăng ký bỏ qua mật khẩu hiện tại', () => {
    expect(evaluatePasswordRules(REGISTER_PASSWORD_RULES, '12345678', 'khong-dung-toi')).toEqual([
      { id: 'minLength', min: 8, met: true },
    ]);
  });
});

describe('minLength: đếm UTF-16 .length như FluentValidation', () => {
  it.each([
    ['1234567', false],
    ['12345678', true],
    ['123456789', true],
    ['', false],
  ] as const)('"%s" -> %s', (pw, expected) => {
    expect(metOf(REGISTER_PASSWORD_RULES, 'minLength', pw)).toBe(expected);
    expect(metOf(CHANGE_PASSWORD_RULES, 'minLength', pw)).toBe(expected);
  });
});

describe('special: chỉ nhận ! ? * @ # $ % ^ & + = (D-34, T-03-09)', () => {
  it.each([['a!'], ['a?'], ['a*'], ['a@'], ['a#'], ['a$'], ['a%'], ['a^'], ['a&'], ['a+'], ['a=']] as const)(
    'đạt với "%s"',
    (pw) => {
      expect(metOf(CHANGE_PASSWORD_RULES, 'special', pw)).toBe(true);
    },
  );

  it.each([['a-'], ['a_'], ['a.'], ['a b'], ['a~'], ['a,'], ['a;'], ['a/'], ['a(']] as const)(
    'không đạt với "%s"',
    (pw) => {
      expect(metOf(CHANGE_PASSWORD_RULES, 'special', pw)).toBe(false);
    },
  );
});

describe('uppercase, lowercase, digit: chỉ ASCII như regex .NET mặc định', () => {
  it.each([
    ['A', true],
    ['Z', true],
    ['a', false],
    ['Đ', false],
    ['Ă', false],
    ['1', false],
  ] as const)('uppercase "%s" -> %s', (pw, expected) => {
    expect(metOf(CHANGE_PASSWORD_RULES, 'uppercase', pw)).toBe(expected);
  });

  it.each([
    ['a', true],
    ['z', true],
    ['A', false],
    ['ă', false],
    ['đ', false],
    ['1', false],
  ] as const)('lowercase "%s" -> %s', (pw, expected) => {
    expect(metOf(CHANGE_PASSWORD_RULES, 'lowercase', pw)).toBe(expected);
  });

  it.each([
    ['0', true],
    ['9', true],
    ['a', false],
    // Chữ số không phải ASCII (Arabic-Indic) không tính.
    ['\u0663', false],
  ] as const)('digit "%s" -> %s', (pw, expected) => {
    expect(metOf(CHANGE_PASSWORD_RULES, 'digit', pw)).toBe(expected);
  });
});

describe('differentFromCurrent', () => {
  it('không đạt khi mật khẩu mới rỗng', () => {
    expect(metOf(CHANGE_PASSWORD_RULES, 'differentFromCurrent', '', 'cu')).toBe(false);
    expect(metOf(CHANGE_PASSWORD_RULES, 'differentFromCurrent', '', '')).toBe(false);
    expect(metOf(CHANGE_PASSWORD_RULES, 'differentFromCurrent', '')).toBe(false);
  });

  it('không đạt khi trùng mật khẩu hiện tại', () => {
    expect(metOf(CHANGE_PASSWORD_RULES, 'differentFromCurrent', 'Abcdef1!', 'Abcdef1!')).toBe(false);
  });

  it('đạt khi khác mật khẩu hiện tại, kể cả chỉ khác hoa thường', () => {
    expect(metOf(CHANGE_PASSWORD_RULES, 'differentFromCurrent', 'Abcdef1!', 'Abcdef1?')).toBe(true);
    expect(metOf(CHANGE_PASSWORD_RULES, 'differentFromCurrent', 'abcdef1!', 'Abcdef1!')).toBe(true);
  });

  it('bỏ qua mật khẩu hiện tại (undefined) thì đạt nếu mật khẩu mới không rỗng', () => {
    expect(metOf(CHANGE_PASSWORD_RULES, 'differentFromCurrent', 'x')).toBe(true);
  });
});

describe('Mật khẩu không bị trim (T-03-08)', () => {
  it('khoảng trắng hai đầu vẫn được đếm vào độ dài', () => {
    expect(metOf(CHANGE_PASSWORD_RULES, 'minLength', '      1!')).toBe(true);
    expect(metOf(REGISTER_PASSWORD_RULES, 'minLength', '       a')).toBe(true);
  });

  it('chuỗi có khoảng trắng hai đầu vẫn đạt đủ các mục, và khác bản đã trim', () => {
    const results = evaluatePasswordRules(CHANGE_PASSWORD_RULES, ' Abcdef1! ', 'Abcdef1!');

    expect(results.every((result) => result.met)).toBe(true);
  });
});
