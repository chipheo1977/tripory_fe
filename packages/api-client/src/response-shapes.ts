// Type guard viết tay cho body BE. Không dùng thư viện schema (lint `httpPackage()` chỉ cho
// shared-kernel) và không dùng `as` để kết luận kiểu: mỗi field được kiểm trước khi tin.
//
// Khóa phân biệt hai dạng: `status` của envelope `ApiResponse` là CHUỖI 'success' | 'error',
// còn `status` của ProblemDetails là SỐ (02-RESEARCH.md §"Hình dạng lỗi BE").

export type ApiEnvelope = Readonly<{
  status: 'success' | 'error';
  data?: unknown;
  message?: string | null;
  errorCode?: string | null;
}>;

export type ProblemDetails = Readonly<{
  type?: string;
  title?: string;
  status?: number;
}>;

export type ValidationProblemDetails = ProblemDetails & Readonly<{ errors: Readonly<Record<string, readonly string[]>> }>;

export type ReadBodyResult = { kind: 'empty' } | { kind: 'json'; value: unknown } | { kind: 'invalid' };

export function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

const isOptionalNullableString = (value: unknown): boolean =>
  value === undefined || value === null || typeof value === 'string';

const isStringArray = (value: unknown): value is readonly string[] =>
  Array.isArray(value) && value.every((item) => typeof item === 'string');

export function isApiEnvelope(value: unknown): value is ApiEnvelope {
  if (!isRecord(value)) return false;
  return (
    (value.status === 'success' || value.status === 'error') &&
    isOptionalNullableString(value.message) &&
    isOptionalNullableString(value.errorCode)
  );
}

export function isProblemDetails(value: unknown): value is ProblemDetails {
  if (!isRecord(value)) return false;
  const statusOk = value.status === undefined || typeof value.status === 'number';
  return statusOk && (typeof value.title === 'string' || typeof value.type === 'string');
}

export function isValidationProblemDetails(value: unknown): value is ValidationProblemDetails {
  if (!isRecord(value) || !isProblemDetails(value)) return false;
  const errors: unknown = 'errors' in value ? value.errors : undefined;
  return isRecord(errors) && Object.values(errors).every(isStringArray);
}

/** Body rỗng, JSON hợp lệ, hoặc không đọc được (HTML từ proxy, JSON hỏng). Không bao giờ ném. */
export function readBody(text: string): ReadBodyResult {
  if (text.trim() === '') return { kind: 'empty' };
  try {
    return { kind: 'json', value: JSON.parse(text) as unknown };
  } catch {
    return { kind: 'invalid' };
  }
}
