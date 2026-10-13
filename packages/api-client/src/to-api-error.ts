import { makeApiError, type ApiError, type FieldErrors } from './api-error';
import { isApiEnvelope, isValidationProblemDetails } from './response-shapes';

// Chuẩn hóa mọi body lỗi BE thành `ApiError`. Hàm thuần, không ném với bất kỳ body nào.
//
// - Envelope (nghiệp vụ, 5xx, FluentValidation): giữ `errorCode` và `message` BE. FluentValidation
//   không có tên field nên không có `fieldErrors` (D-05a); message tiếng Việt của BE đi lên toast.
// - ValidationProblemDetails: `title`/`errors` là tiếng Anh của framework, không dành cho người dùng,
//   nên `message` đặt `null`. Chuỗi gốc vẫn giữ trong `fieldErrors` để debug (D-05a).
// - ProblemDetails trơn, body rỗng, HTML, JSON hỏng: `code` và `message` đều `null`.
//
// Chỉ chép các field đã biết; raw body (có thể chứa token) không bao giờ đi vào `ApiError`.

const nonEmpty = (value: string | null | undefined): string | null =>
  typeof value === 'string' && value.trim() !== '' ? value : null;

/** "Email" → "email", "$.startDate" → "startDate", "Items[0].Name" → "items[0].name", "$"/"" → "". */
export function normalizeFieldKey(key: string): string {
  return key
    .replace(/^\$\.?/, '')
    .split('.')
    .map((segment) => segment.charAt(0).toLowerCase() + segment.slice(1))
    .join('.');
}

// Gộp key trùng sau chuẩn hóa (`Email` và `$.email`) theo thứ tự xuất hiện. Key rỗng giữ nguyên
// để tầng trình bày coi là "không khớp ô nào".
function normalizeFieldErrors(errors: Readonly<Record<string, readonly string[]>>): FieldErrors {
  const merged = new Map<string, string[]>();
  for (const [key, messages] of Object.entries(errors)) {
    const normalized = normalizeFieldKey(key);
    const existing = merged.get(normalized);
    if (existing) existing.push(...messages);
    else merged.set(normalized, [...messages]);
  }
  return Object.freeze(Object.fromEntries(merged));
}

export function toApiError(status: number, body: unknown): ApiError {
  if (isApiEnvelope(body)) {
    return makeApiError({ kind: 'http', status, code: nonEmpty(body.errorCode), message: nonEmpty(body.message) });
  }
  if (isValidationProblemDetails(body)) {
    return makeApiError({
      kind: 'http',
      status,
      code: null,
      message: null,
      fieldErrors: normalizeFieldErrors(body.errors),
    });
  }
  return makeApiError({ kind: 'http', status, code: null, message: null });
}
