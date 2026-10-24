// Map lỗi BE của một lần submit sang "gắn vào ô nào" hoặc "InlineAlert ở đầu form" (D-05, D-19).
//
// Zod phía client (`form-schemas.ts`) chặn trước hầu hết ca, đây chỉ là lưới an toàn cho lỗi lọt qua
// (D-29: BE vẫn là nguồn sự thật). Bảng mã -> ô là THEO TỪNG FORM, vì cùng một mã `*Validator` của
// FluentValidation mang nghĩa khác nhau giữa các form (`MinimumLengthValidator` là mật khẩu ở cả đăng ký
// lẫn đổi mật khẩu nhưng là `fullName` thì không). Vì vậy KHÔNG đưa các mã này vào `ERROR_MESSAGES` toàn
// cục (RESEARCH §Anti-Patterns): ở đó chúng phải rơi về message BE.
//
// Kết quả `null` = không hiện gì. `session_expired` rơi vào đây vì `onSessionExpired` đã chuyển trang và
// bắn toast (D-20, Phase 2 IN-02) nên form hiện thêm lỗi chỉ gây nhiễu; `aborted` là request bị hủy.
//
// Tra bằng `Map` (như `error-messages.ts`) để `toString`, `__proto__`... không khớp nhầm key prototype.
// Hàm chỉ đọc `code`/`message` của BE, không nhận giá trị người dùng nhập nên mật khẩu không thể lọt vào
// thông báo lỗi (T-03-47); message BE được trả nguyên cho React render như text node (T-03-50).
import { isApiError, type ApiError } from "@tripory/api-client";
import {
  ERROR_MESSAGES,
  GENERIC_ERROR_MESSAGE,
  resolveFormError,
  selectErrorMessage,
} from "@/lib/feedback";
import { CHANGE_PASSWORD_FIELDS, LOGIN_FIELDS, REGISTER_FIELDS } from "./form-schemas";

export type FormErrorMapping<F extends string> = Readonly<{
  fieldErrors: Partial<Record<F, string>>;
  alert: string | null;
}>;

const ALERT = "alert";

type Target<F extends string> = F | typeof ALERT;

const alertOnly = <F extends string>(message: string | null): FormErrorMapping<F> => ({
  fieldErrors: {},
  alert: message ?? GENERIC_ERROR_MESSAGE,
});

/** Nội dung gắn ô: bảng map -> message BE -> câu chung. */
const fieldMessage = (error: ApiError): string =>
  (error.code === null ? undefined : ERROR_MESSAGES.get(error.code)) ?? error.message ?? GENERIC_ERROR_MESSAGE;

function mapFormError<F extends string>(
  error: unknown,
  fields: readonly F[],
  table: ReadonlyMap<string, Target<F>>,
): FormErrorMapping<F> | null {
  // Lỗi không phải ApiError (bug, lỗi parse ngoài dự kiến): câu chung, không lộ chi tiết kỹ thuật.
  if (!isApiError(error)) return alertOnly(selectErrorMessage(error));
  if (error.kind === "session_expired" || error.kind === "aborted") return null;

  // ValidationProblemDetails: có tên field nhưng message tiếng Anh, `resolveFormError` đã lo phần
  // "Giá trị không hợp lệ." và key lạ -> câu chung (D-05a).
  if (error.fieldErrors && Object.keys(error.fieldErrors).length > 0) {
    const resolved = resolveFormError(error, fields);
    const fieldErrors: Partial<Record<F, string>> = {};
    for (const field of fields) {
      if (Object.hasOwn(resolved.fieldErrors, field)) fieldErrors[field] = resolved.fieldErrors[field];
    }
    return { fieldErrors, alert: resolved.toastMessage };
  }

  const target = error.code === null ? undefined : table.get(error.code);
  if (target !== undefined && target !== ALERT) {
    return { fieldErrors: { [target]: fieldMessage(error) } as Partial<Record<F, string>>, alert: null };
  }

  // Mã không gắn được vào ô (kể cả mã mơ hồ, mạng, timeout, 5xx): InlineAlert với bảng map -> message BE -> câu chung.
  return alertOnly(selectErrorMessage(error));
}

type LoginField = (typeof LOGIN_FIELDS)[number];
type RegisterField = (typeof REGISTER_FIELDS)[number];
type ChangePasswordField = (typeof CHANGE_PASSWORD_FIELDS)[number];

const LOGIN_TARGETS: ReadonlyMap<string, Target<LoginField>> = new Map<string, Target<LoginField>>([
  // Cùng một câu cho email sai lẫn mật khẩu sai (BE không cho biết email có tồn tại hay không, T-03-49).
  ["Auth.InvalidCredentials", ALERT],
  // Message BE có lý do khóa tài khoản nên hiện nguyên văn.
  ["Auth.UserBanned", ALERT],
  ["EmailValidator", "email"],
  // Mơ hồ: nhiều field cùng mã, FluentValidation chỉ trả lỗi đầu tiên.
  ["NotEmptyValidator", ALERT],
]);

const REGISTER_TARGETS: ReadonlyMap<string, Target<RegisterField>> = new Map<string, Target<RegisterField>>([
  ["User.EmailAlreadyExists", "email"],
  ["Email.InvalidFormat", "email"],
  ["Email.Empty", "email"],
  ["Email.TooLong", "email"],
  ["EmailValidator", "email"],
  ["User.InvalidFullName", "fullName"],
  ["MaximumLengthValidator", "fullName"],
  ["MinimumLengthValidator", "password"],
  ["NotEmptyValidator", ALERT],
]);

const CHANGE_PASSWORD_TARGETS: ReadonlyMap<string, Target<ChangePasswordField>> = new Map<
  string,
  Target<ChangePasswordField>
>([
  ["Auth.InvalidCurrentPassword", "currentPassword"],
  // Mật khẩu mới trùng mật khẩu hiện tại (D-19): message BE đã nói rõ nên hiện nguyên văn.
  ["NotEqualValidator", "newPassword"],
  ["MinimumLengthValidator", "newPassword"],
  ["RegularExpressionValidator", "newPassword"],
  ["NotEmptyValidator", ALERT],
]);

export const mapLoginError = (error: unknown): FormErrorMapping<LoginField> | null =>
  mapFormError(error, LOGIN_FIELDS, LOGIN_TARGETS);

export const mapRegisterError = (error: unknown): FormErrorMapping<RegisterField> | null =>
  mapFormError(error, REGISTER_FIELDS, REGISTER_TARGETS);

export const mapChangePasswordError = (error: unknown): FormErrorMapping<ChangePasswordField> | null =>
  mapFormError(error, CHANGE_PASSWORD_FIELDS, CHANGE_PASSWORD_TARGETS);
