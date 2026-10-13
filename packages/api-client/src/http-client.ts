// Hợp đồng HTTP dùng chung cho mọi bounded context. Chỉ có type: adapter cụ thể
// (`createFetchHttpClient`) nằm ở subpath `./http`, chỉ composition được import.

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export type QueryValue = string | number | boolean | null | undefined;

export type HttpRequest = Readonly<{
  method: HttpMethod;
  /** Nối sau baseUrl, ví dụ '/api/v1/itineraries'. */
  path: string;
  /** Giá trị null/undefined bị bỏ khỏi query string. */
  query?: Readonly<Record<string, QueryValue>>;
  /** FormData giữ nguyên; giá trị khác được gửi dạng JSON. */
  body?: unknown;
  headers?: Readonly<Record<string, string>>;
  signal?: AbortSignal;
  timeoutMs?: number;
  /** false: login/register/refresh không vào nhánh refresh phiên. */
  sessionRefresh?: boolean;
}>;

export type HttpClient = Readonly<{ send(request: HttpRequest): Promise<unknown> }>;
