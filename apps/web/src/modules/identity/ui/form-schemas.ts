// Schema Zod của ba form auth (D-29): validate đầy đủ phía client, BE vẫn là nguồn sự thật.
// Copy lỗi lấy nguyên từ UI-SPEC §Lỗi validate client (Zod): câu có dấu chấm cuối, không chấm than.
//
// Mỗi ô chỉ phát ra MỘT lỗi tại một thời điểm (rỗng thì "Vui lòng nhập…", không kèm lỗi dạng/độ mạnh),
// để form hiện đúng câu cho người dùng chứ không phụ thuộc thứ tự issue.
import {
  CHANGE_PASSWORD_RULES,
  REGISTER_PASSWORD_RULES,
  evaluatePasswordRules,
  type PasswordRule,
} from "@tripory/identity";
import { z } from "zod";

const EMAIL_REQUIRED = "Vui lòng nhập email.";
const EMAIL_INVALID = "Email không đúng định dạng.";
const FULL_NAME_REQUIRED = "Vui lòng nhập họ và tên.";
const FULL_NAME_TOO_LONG = "Họ và tên tối đa 100 ký tự.";
const PASSWORD_REQUIRED = "Vui lòng nhập mật khẩu.";
const PASSWORD_WEAK = "Mật khẩu chưa đạt đủ yêu cầu.";
const CURRENT_PASSWORD_REQUIRED = "Vui lòng nhập mật khẩu hiện tại.";
const CONFIRM_REQUIRED = "Vui lòng nhập lại mật khẩu.";
const CONFIRM_MISMATCH = "Mật khẩu nhập lại không khớp.";

const FULL_NAME_MAX_LENGTH = 100;

// Dạng email chuẩn, cố ý KHÔNG chép regex của BE (D-33): regex của `Email` VO ở `tripory_be` đang thiếu
// dấu `\` nên chặn mọi email có chữ "s", người dùng sửa ở repo BE. FE không được mạnh hơn hay lệch BE,
// nên chỉ kiểm dạng `local@domain.tld` không có khoảng trắng; BE vẫn là nguồn sự thật.
const isEmailShape = (value: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

const meetsAll = (rules: readonly PasswordRule[], password: string, current?: string): boolean =>
  evaluatePasswordRules(rules, password, current).every((result) => result.met);

// `.trim()` chạy trước `superRefine` nên giá trị kiểm tra và giá trị đầu ra đã trim.
const emailField = z
  .string()
  .trim()
  .superRefine((value, ctx) => {
    if (value.length === 0) ctx.addIssue({ code: "custom", message: EMAIL_REQUIRED });
    else if (!isEmailShape(value)) ctx.addIssue({ code: "custom", message: EMAIL_INVALID });
  });

// Họ tên: BE đếm độ dài trước khi trim (RESEARCH §Họ tên) nên đếm trên giá trị thô, kể cả khoảng trắng cuối.
const fullNameField = z.string().superRefine((value, ctx) => {
  if (value.trim().length === 0) ctx.addIssue({ code: "custom", message: FULL_NAME_REQUIRED });
  else if (value.length > FULL_NAME_MAX_LENGTH) ctx.addIssue({ code: "custom", message: FULL_NAME_TOO_LONG });
});

// Mật khẩu là chuỗi thô: không trim (BE không trim), kể cả chuỗi toàn khoảng trắng.
const requiredPassword = (message: string) => z.string().min(1, message);

const requiredConfirm = z.string().min(1, CONFIRM_REQUIRED);

export const LOGIN_FIELDS = ["email", "password"] as const;
export const REGISTER_FIELDS = ["fullName", "email", "password", "confirmPassword"] as const;
export const CHANGE_PASSWORD_FIELDS = ["currentPassword", "newPassword", "confirmPassword"] as const;

export const loginSchema = z.object({
  email: emailField,
  password: requiredPassword(PASSWORD_REQUIRED),
});

export const registerSchema = z
  .object({
    fullName: fullNameField,
    email: emailField,
    password: requiredPassword(PASSWORD_REQUIRED),
    confirmPassword: requiredConfirm,
  })
  .superRefine((values, ctx) => {
    // Rỗng đã có lỗi "Vui lòng nhập mật khẩu." ở field; chỉ báo độ mạnh khi đã nhập.
    if (values.password.length > 0 && !meetsAll(REGISTER_PASSWORD_RULES, values.password)) {
      ctx.addIssue({ code: "custom", path: ["password"], message: PASSWORD_WEAK });
    }
    if (values.confirmPassword.length > 0 && values.confirmPassword !== values.password) {
      ctx.addIssue({ code: "custom", path: ["confirmPassword"], message: CONFIRM_MISMATCH });
    }
  });

export const changePasswordSchema = z
  .object({
    currentPassword: requiredPassword(CURRENT_PASSWORD_REQUIRED),
    newPassword: requiredPassword(PASSWORD_REQUIRED),
    confirmPassword: requiredConfirm,
  })
  .superRefine((values, ctx) => {
    // Cần `currentPassword` cho rule `differentFromCurrent`, nên kiểm ở mức object. Trùng mật khẩu
    // hiện tại làm rule này fail nên cùng câu "chưa đạt đủ yêu cầu", gắn vào `newPassword` (D-19).
    if (
      values.newPassword.length > 0 &&
      !meetsAll(CHANGE_PASSWORD_RULES, values.newPassword, values.currentPassword)
    ) {
      ctx.addIssue({ code: "custom", path: ["newPassword"], message: PASSWORD_WEAK });
    }
    if (values.confirmPassword.length > 0 && values.confirmPassword !== values.newPassword) {
      ctx.addIssue({ code: "custom", path: ["confirmPassword"], message: CONFIRM_MISMATCH });
    }
  });

export type LoginValues = z.infer<typeof loginSchema>;
export type RegisterValues = z.infer<typeof registerSchema>;
export type ChangePasswordValues = z.infer<typeof changePasswordSchema>;
