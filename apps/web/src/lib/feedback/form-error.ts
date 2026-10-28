// Map lỗi BE của một lần submit sang "gắn vào ô nào" hoặc "InlineAlert ở đầu form" (D-05, D-19).
// Phần generic dùng chung cho mọi form (identity, itinerary); bảng mã -> ô là THEO TỪNG FORM nên nằm ở
// module của form, truyền vào qua `table`.
//
// Kết quả `null` = không hiện gì. `session_expired` rơi vào đây vì `onSessionExpired` đã chuyển trang và
// bắn toast (D-20, Phase 2 IN-02) nên form hiện thêm lỗi chỉ gây nhiễu; `aborted` là request bị hủy.
//
// Hàm chỉ đọc `code`/`message` của BE, không nhận giá trị người dùng nhập nên mật khẩu không thể lọt vào
// thông báo lỗi (T-03-47); message BE được trả nguyên cho React render như text node (T-03-50).
import { isApiError, type ApiError } from "@tripory/api-client";
import { ERROR_MESSAGES, GENERIC_ERROR_MESSAGE } from "./error-messages";
import { resolveFormError } from "./resolve-form-error";
import { selectErrorMessage } from "./select-error-message";

export type FormErrorMapping<F extends string> = Readonly<{
  fieldErrors: Partial<Record<F, string>>;
  alert: string | null;
}>;

/** Dấu hiệu trong bảng map: mã này không gắn được vào ô nào, hiện ở InlineAlert đầu form. */
export const FORM_ALERT = "alert";

export type FormErrorTarget<F extends string> = F | typeof FORM_ALERT;

const alertOnly = <F extends string>(message: string | null): FormErrorMapping<F> => ({
  fieldErrors: {},
  alert: message ?? GENERIC_ERROR_MESSAGE,
});

/** Nội dung gắn ô: bảng map -> message BE -> câu chung. */
const fieldMessage = (error: ApiError): string =>
  (error.code === null ? undefined : ERROR_MESSAGES.get(error.code)) ?? error.message ?? GENERIC_ERROR_MESSAGE;

export function mapFormError<F extends string>(
  error: unknown,
  fields: readonly F[],
  table: ReadonlyMap<string, FormErrorTarget<F>>,
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
  if (target !== undefined && target !== FORM_ALERT) {
    return { fieldErrors: { [target]: fieldMessage(error) } as Partial<Record<F, string>>, alert: null };
  }

  // Mã không gắn được vào ô (kể cả mã mơ hồ, mạng, timeout, 5xx): InlineAlert với bảng map -> message BE -> câu chung.
  return alertOnly(selectErrorMessage(error));
}
