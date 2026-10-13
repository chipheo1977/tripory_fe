import { isApiError } from "@tripory/api-client";
import { ERROR_MESSAGES, GENERIC_ERROR_MESSAGE } from "./error-messages";

/**
 * Chọn câu hiển thị cho một lỗi bất kỳ; `null` = không hiện gì (request bị hủy).
 * Thứ tự: map errorCode → message BE → câu chung (D-03, D-04). Lỗi không phải `ApiError`
 */
export function selectErrorMessage(error: unknown): string | null {
  if (!isApiError(error)) return GENERIC_ERROR_MESSAGE;
  if (error.kind === "aborted") return null;
  const mapped = error.code === null ? undefined : ERROR_MESSAGES.get(error.code);
  return mapped ?? error.message ?? GENERIC_ERROR_MESSAGE;
}
