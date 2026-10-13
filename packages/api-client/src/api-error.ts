// `ApiError` là plain object, không khai báo lớp: theo quy ước "không dùng lớp" (tài liệu kiến
// trúc mục 1) và để serialize được qua ranh giới server/client. Đổi lại không có stack trace,
// chấp nhận được với lỗi HTTP.
//
// Không lưu raw body, header hay token vào `ApiError`: body của refresh/login chứa token, và lỗi
// có thể bị log hoặc serialize sang client. `message` là message BE thô hoặc `null`; tầng này
// KHÔNG đặt câu mặc định cho người dùng, copy thuộc về app (D-03, D-04).

export type ApiErrorKind = 'http' | 'network' | 'timeout' | 'aborted' | 'parse' | 'session_expired';

export type FieldErrors = Readonly<Record<string, readonly string[]>>;

export type ApiError = Readonly<{
  /** Dấu nhận diện cho isApiError. */
  type: 'ApiError';
  kind: ApiErrorKind;
  /** null với network/timeout/aborted. */
  status: number | null;
  /** errorCode của BE, hoặc SESSION_EXPIRED. */
  code: string | null;
  /** Message BE thô; null nếu BE không có câu dành cho người dùng. */
  message: string | null;
  /** Chỉ có khi BE trả ValidationProblemDetails. */
  fieldErrors?: FieldErrors;
}>;

export const SESSION_EXPIRED = 'session.expired';

const API_ERROR_KINDS: ReadonlySet<string> = new Set<ApiErrorKind>([
  'http',
  'network',
  'timeout',
  'aborted',
  'parse',
  'session_expired',
]);

export function makeApiError(fields: Omit<ApiError, 'type'>): ApiError {
  const { kind, status, code, message, fieldErrors } = fields;
  return Object.freeze({ type: 'ApiError', kind, status, code, message, ...(fieldErrors ? { fieldErrors } : {}) });
}

export function isApiError(value: unknown): value is ApiError {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as { type?: unknown; kind?: unknown };
  return candidate.type === 'ApiError' && typeof candidate.kind === 'string' && API_ERROR_KINDS.has(candidate.kind);
}

export function sessionExpiredError(): ApiError {
  return makeApiError({ kind: 'session_expired', status: 401, code: SESSION_EXPIRED, message: null });
}
