 import { isApiError, makeApiError, type ApiErrorKind } from './api-error';
import type { HttpClient, HttpRequest } from './http-client';
import { isApiEnvelope, readBody } from './response-shapes';
import { toApiError } from './to-api-error';

export type FetchHttpClientDeps = Readonly<{
  baseUrl: string;
  /** Composition truyền globalThis.fetch.bind(globalThis). */
  fetch: typeof fetch;
  /** Mặc định DEFAULT_TIMEOUT_MS. */
  timeoutMs?: number;
  /** Phase 3 phía server: header Bearer. */
  getHeaders?: () => Promise<Readonly<Record<string, string>>>;
}>;

/** D-11: BE chạy host free, cold start lâu nên cửa sổ chờ rộng. */
export const DEFAULT_TIMEOUT_MS = 30_000;

const clientError = (kind: ApiErrorKind) => makeApiError({ kind, status: null, code: null, message: null });

function buildUrl(baseUrl: string, request: HttpRequest): string {
  const base = baseUrl.replace(/\/+$/, '');
  const path = request.path.startsWith('/') ? request.path : `/${request.path}`;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(request.query ?? {})) {
    if (value !== null && value !== undefined) params.append(key, String(value));
  }
  const query = params.toString();
  return query === '' ? `${base}${path}` : `${base}${path}?${query}`;
}

function buildBody(body: unknown): BodyInit | undefined {
  if (body === undefined) return undefined;
  // FormData (voice, Phase 7) để nguyên: runtime tự đặt Content-Type có boundary.
  if (body instanceof FormData) return body;
  return JSON.stringify(body);
}

function buildHeaders(request: HttpRequest, injected: Readonly<Record<string, string>> | undefined): Headers {
  const headers = new Headers({ Accept: 'application/json' });
  // Thiếu Content-Type thì BE trả 415.
  if (request.body !== undefined && !(request.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }
  // `Headers.set` không phân biệt hoa thường, nên request.headers ghi đè đúng header cùng tên.
  for (const [name, value] of Object.entries(injected ?? {})) headers.set(name, value);
  for (const [name, value] of Object.entries(request.headers ?? {})) headers.set(name, value);
  return headers;
}

function parseResponse(status: number, text: string): unknown {
  const body = readBody(text);
  if (status >= 200 && status < 300) {
    if (body.kind === 'empty') return undefined;
    if (body.kind === 'json' && isApiEnvelope(body.value) && body.value.status === 'success') return body.value.data;
    throw makeApiError({ kind: 'parse', status, code: null, message: null });
  }
  throw toApiError(status, body.kind === 'json' ? body.value : undefined);
}

/**
 * Client `fetch` trả `data` của envelope hoặc ném `ApiError`. Không tự thử lại (D-12): phát lại
 * request ghi có thể tạo bản ghi trùng, còn query thì TanStack Query quyết định.
 */
export function createFetchHttpClient(deps: FetchHttpClientDeps): HttpClient {
  // Gọi như hàm trần: gọi dạng `deps.fetch(...)` làm `this` thành object deps và trình duyệt ném
  // "Illegal invocation".
  const doFetch = deps.fetch;

  return {
    async send(request) {
      // Chạy trước khi tạo timer và nằm ngoài try: lỗi của getHeaders lan nguyên cho caller.
      const injected = await deps.getHeaders?.();

      // Timeout tự cài bằng AbortController + setTimeout. Không dùng `AbortSignal` tĩnh `any()`
      // (cần Safari/iOS >= 17.4) hay `timeout()` (fake timers không điều khiển được). Cờ
      // `timedOut` phân biệt chắc chắn timeout với caller abort.
      const controller = new AbortController();
      let timedOut = false;
      const timer = setTimeout(() => {
        timedOut = true;
        controller.abort();
      }, request.timeoutMs ?? deps.timeoutMs ?? DEFAULT_TIMEOUT_MS);

      const onAbort = () => controller.abort();
      if (request.signal?.aborted) onAbort();
      else request.signal?.addEventListener('abort', onAbort, { once: true });

      try {
        const response = await doFetch(buildUrl(deps.baseUrl, request), {
          method: request.method,
          headers: buildHeaders(request, injected),
          body: buildBody(request.body),
          signal: controller.signal,
        });
        // Đọc body vẫn nằm trong cửa sổ timeout: BE/proxy có thể gửi header rồi treo body.
        const text = await response.text();
        return parseResponse(response.status, text);
      } catch (error) {
        if (isApiError(error)) throw error;
        if (timedOut) throw clientError('timeout');
        if (request.signal?.aborted) throw clientError('aborted');
        throw clientError('network');
      } finally {
        clearTimeout(timer);
        request.signal?.removeEventListener('abort', onAbort);
      }
    },
  };
}
