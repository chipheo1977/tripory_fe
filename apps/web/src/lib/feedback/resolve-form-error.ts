// Tách lỗi của một thao tác submit form thành lỗi gắn vào ô và câu toast (D-05, D-05a, D-06).
//
// - `ValidationProblemDetails` của ASP.NET có tên field nhưng message là tiếng Anh, nên ô form chỉ
//   hiện "Giá trị không hợp lệ." và field không khớp form (kể cả key rỗng) thì toast câu chung.
//   Form phải validate phía client để chặn trước; nhánh này chỉ là lưới an toàn.
// - FluentValidation của BE không có tên field (envelope `errorCode` + `message` tiếng Việt), nên
//   toast message BE qua `selectErrorMessage`.
import { isApiError } from "@tripory/api-client";
import { FIELD_INVALID_MESSAGE, GENERIC_ERROR_MESSAGE } from "./error-messages";
import { selectErrorMessage } from "./select-error-message";

export type FormErrorResolution = Readonly<{
  fieldErrors: Readonly<Record<string, string>>;
  toastMessage: string | null;
}>;

export function resolveFormError(error: unknown, fieldNames: readonly string[]): FormErrorResolution {
  if (isApiError(error) && error.fieldErrors && Object.keys(error.fieldErrors).length > 0) {
    const known = new Set(fieldNames);
    const matched = new Map<string, string>();
    let toastMessage: string | null = null;
    for (const key of Object.keys(error.fieldErrors)) {
      if (known.has(key)) {
        matched.set(key, FIELD_INVALID_MESSAGE);
      } else {
        toastMessage ??= GENERIC_ERROR_MESSAGE;
      }
    }
    return { fieldErrors: Object.fromEntries(matched), toastMessage };
  }
  return { fieldErrors: {}, toastMessage: selectErrorMessage(error) };
}
