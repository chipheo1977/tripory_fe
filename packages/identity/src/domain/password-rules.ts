// Rule mật khẩu dạng dữ liệu, để checklist trong UI và schema kiểm tra của form dùng chung một nguồn.
//
// Nguồn: tripory_be, `Application/Features/Auth/Validators/`
//  - RegisterCommandValidator.cs:19-26: chỉ `MinimumLength(8)`; các rule hoa/thường/số/đặc biệt đang bị comment.
//  - ChangePasswordCommandValidator.cs:12-19: `MinimumLength(8)`, `Matches([A-Z])`, `Matches([a-z])`,
//    `Matches([0-9])`, `Matches([\!\?\*\@\#\$\%\^\&\+\=])`, `NotEqual(CurrentPassword)`.
//
// Đây là chép luật BE có chủ đích theo D-27 ("FE không mạnh hơn BE"): người dùng cần thấy rule trước khi
// nhập (AUTH-06). Đổi validator BE thì đổi ở đây. BE vẫn là nguồn sự thật, lỗi lọt qua FE xử lý ở form.
//
// Mật khẩu là chuỗi thô: không trim (BE không trim), không ghi log. Copy tiếng Việt của từng rule thuộc app.

export type PasswordRuleId = 'minLength' | 'uppercase' | 'lowercase' | 'digit' | 'special' | 'differentFromCurrent';

export type PasswordRule = Readonly<{
  id: PasswordRuleId;
  /** Chỉ có ở `minLength`, để UI hiện "Ít nhất {min} ký tự". */
  min?: number;
  /** `current` là mật khẩu hiện tại, chỉ `differentFromCurrent` đọc. */
  test: (pw: string, current?: string) => boolean;
}>;

export type PasswordRuleResult = Readonly<{ id: PasswordRuleId; min?: number; met: boolean }>;

// FluentValidation đếm `string.Length` (UTF-16), `.length` của JS cũng vậy nên hai bên khớp nhau.
const minLength = (min: number): PasswordRule => ({ id: 'minLength', min, test: (pw) => pw.length >= min });

// Regex chỉ ASCII, giống regex .NET mặc định của BE: "Đ" không phải chữ hoa, "ă" không phải chữ thường.
// Tập ký tự đặc biệt bị giới hạn đúng như BE (D-34): `-`, `_`, `.`, `~` và khoảng trắng không tính.
const UPPERCASE = /[A-Z]/;
const LOWERCASE = /[a-z]/;
const DIGIT = /[0-9]/;
const SPECIAL = /[!?*@#$%^&+=]/;

/** Đăng ký: BE chỉ đòi tối thiểu 8 ký tự (D-27). */
export const REGISTER_PASSWORD_RULES: readonly PasswordRule[] = [minLength(8)];

/** Đổi mật khẩu: đúng 6 mục của validator BE (D-34). */
export const CHANGE_PASSWORD_RULES: readonly PasswordRule[] = [
  minLength(8),
  { id: 'uppercase', test: (pw) => UPPERCASE.test(pw) },
  { id: 'lowercase', test: (pw) => LOWERCASE.test(pw) },
  { id: 'digit', test: (pw) => DIGIT.test(pw) },
  { id: 'special', test: (pw) => SPECIAL.test(pw) },
  // Rỗng không tính là "khác": checklist chưa gõ gì thì chưa đánh dấu đạt.
  { id: 'differentFromCurrent', test: (pw, current) => pw.length > 0 && pw !== current },
];

/** Đánh giá từng rule, trả kết quả cùng thứ tự với `rules`. */
export const evaluatePasswordRules = (
  rules: readonly PasswordRule[],
  pw: string,
  current?: string,
): readonly PasswordRuleResult[] =>
  rules.map((rule) => ({
    id: rule.id,
    ...(rule.min === undefined ? {} : { min: rule.min }),
    met: rule.test(pw, current),
  }));
