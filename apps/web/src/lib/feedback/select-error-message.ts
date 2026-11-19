import { isApiError } from "@tripory/api-client";
import { ERROR_MESSAGES, GENERIC_ERROR_MESSAGE } from "./error-messages";
/**
 * Chọn câu hiển thị cho một lỗi bất kỳ; `null` = không hiện gì (request bị hủy).
 * Thứ tự: bảng map errorCode → message BE → `fallback` (mặc định câu chung, D-03, D-04).
 * Mọi trường hợp vốn ra câu chung (lỗi không phải `ApiError`, mạng, 5xx rỗng, mã nội bộ map về câu chung)
 * trả `fallback`, để mutation có câu theo ngữ cảnh (05.1 UI-SPEC §Toast lỗi). Gọi một đối số cho kết quả như cũ.
 */
export function selectErrorMessage(error: unknown, fallback: string = GENERIC_ERROR_MESSAGE): string | null {
  if (!isApiError(error)) return fallback;
  if (error.kind === "aborted") return null;
  const mapped = error.code === null ? undefined : ERROR_MESSAGES.get(error.code);
  const message = mapped ?? error.message ?? GENERIC_ERROR_MESSAGE;
  return message === GENERIC_ERROR_MESSAGE ? fallback : message;
}
