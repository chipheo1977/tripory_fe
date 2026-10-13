import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ApiError } from './api-error';
import { createFetchHttpClient, DEFAULT_TIMEOUT_MS } from './fetch-http-client';
import {
  envelopeCreated,
  envelopeNotFound,
  envelopeSuccess,
  htmlBadGateway,
  type BeFixture,
} from './fixtures/be-responses';
import type { HttpRequest } from './http-client';

type FetchArgs = [input: RequestInfo | URL, init?: RequestInit];

const urlOf = (input: RequestInfo | URL): string =>
  typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;

const responseOf = (f: BeFixture): Response =>
  new Response(f.body, { status: f.status, headers: f.contentType ? { 'Content-Type': f.contentType } : {} });

const fixtureFetch = (f: BeFixture) => vi.fn<(...args: FetchArgs) => Promise<Response>>(async () => responseOf(f));

/** Fetch không bao giờ trả lời, chỉ reject khi signal abort (giống fetch thật). */
const hangingFetch = () =>
  vi.fn(
    (_input: RequestInfo | URL, init?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        const signal = init?.signal;
        const fail = () => reject(new DOMException('aborted', 'AbortError'));
        if (signal?.aborted) fail();
        else signal?.addEventListener('abort', fail, { once: true });
      }),
  );

const clientWith = (fetch: (...args: FetchArgs) => Promise<Response>, extra: { timeoutMs?: number } = {}) =>
  createFetchHttpClient({ baseUrl: 'https://api.test', fetch, ...extra });

const get = (overrides: Partial<HttpRequest> = {}): HttpRequest => ({ method: 'GET', path: '/api/v1/x', ...overrides });

const initOf = (fetch: ReturnType<typeof fixtureFetch>): RequestInit => fetch.mock.calls[0]?.[1] ?? {};

const rejection = async (promise: Promise<unknown>): Promise<ApiError> => {
  try {
    await promise;
  } catch (error) {
    return error as ApiError;
  }
  throw new Error('Mong đợi promise bị reject');
};

afterEach(() => {
  vi.useRealTimers();
});

describe('createFetchHttpClient: phản hồi thành công', () => {
  it('200 envelope success → trả data', async () => {
    const client = clientWith(fixtureFetch(envelopeSuccess));
    await expect(client.send(get())).resolves.toEqual({ id: '3f2504e0-4f89-11d3-9a0c-0305e82c3301', title: 'Đà Lạt' });
  });

  it('201 envelope success → trả data', async () => {
    const client = clientWith(fixtureFetch(envelopeCreated));
    await expect(client.send(get({ method: 'POST', body: {} }))).resolves.toEqual({
      id: '3f2504e0-4f89-11d3-9a0c-0305e82c3301',
    });
  });

  it('204 body rỗng → undefined', async () => {
    const client = clientWith(vi.fn(async () => new Response(null, { status: 204 })));
    await expect(client.send(get({ method: 'DELETE' }))).resolves.toBeUndefined();
  });

  it.each([
    { name: 'JSON không phải envelope', body: '{"foo":1}' },
    { name: 'envelope status error với HTTP 200', body: JSON.stringify({ status: 'error', data: null, message: 'x', errorCode: 'X' }) },
    { name: 'HTML 200', body: '<html></html>' },
  ])('2xx sai dạng ($name) → kind parse', async ({ body }) => {
    const client = clientWith(fixtureFetch({ status: 200, contentType: null, body }));
    await expect(client.send(get())).rejects.toEqual({
      type: 'ApiError',
      kind: 'parse',
      status: 200,
      code: null,
      message: null,
    });
  });
});

describe('createFetchHttpClient: lỗi HTTP', () => {
  it('404 envelope → kind http giữ errorCode', async () => {
    const client = clientWith(fixtureFetch(envelopeNotFound));
    await expect(client.send(get())).rejects.toMatchObject({ kind: 'http', status: 404, code: 'Itinerary.NotFound' });
  });

  it('502 HTML → kind http, code và message null', async () => {
    const client = clientWith(fixtureFetch(htmlBadGateway));
    await expect(client.send(get())).rejects.toEqual({
      type: 'ApiError',
      kind: 'http',
      status: 502,
      code: null,
      message: null,
    });
  });

  it('503 không retry: fetch gọi đúng 1 lần', async () => {
    const fetch = fixtureFetch({ status: 503, contentType: null, body: '' });
    await expect(clientWith(fetch).send(get())).rejects.toMatchObject({ kind: 'http', status: 503 });
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('network error → kind network, không retry', async () => {
    const fetch = vi.fn(async (): Promise<Response> => {
      throw new TypeError('fetch failed');
    });
    await expect(clientWith(fetch).send(get())).rejects.toEqual({
      type: 'ApiError',
      kind: 'network',
      status: null,
      code: null,
      message: null,
    });
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});

describe('createFetchHttpClient: dựng request', () => {
  it('body plain object → JSON + Content-Type application/json, luôn có Accept', async () => {
    const fetch = fixtureFetch(envelopeCreated);
    const body = { title: 'Đà Lạt', days: 3 };
    await clientWith(fetch).send(get({ method: 'POST', body }));

    const init = initOf(fetch);
    const headers = new Headers(init.headers);
    expect(init.method).toBe('POST');
    expect(init.body).toBe(JSON.stringify(body));
    expect(headers.get('Content-Type')).toBe('application/json');
    expect(headers.get('Accept')).toBe('application/json');
  });

  it('body FormData giữ nguyên instance, không đặt Content-Type', async () => {
    const fetch = fixtureFetch(envelopeCreated);
    const form = new FormData();
    form.append('note', 'x');
    await clientWith(fetch).send(get({ method: 'POST', body: form }));

    const init = initOf(fetch);
    expect(init.body).toBe(form);
    expect(new Headers(init.headers).has('Content-Type')).toBe(false);
  });

  it('GET không body → init.body undefined, không Content-Type', async () => {
    const fetch = fixtureFetch(envelopeSuccess);
    await clientWith(fetch).send(get());

    const init = initOf(fetch);
    expect(init.body).toBeUndefined();
    expect(new Headers(init.headers).has('Content-Type')).toBe(false);
    expect(new Headers(init.headers).get('Accept')).toBe('application/json');
  });

  it('nối baseUrl có / cuối với path, bỏ query null/undefined', async () => {
    const fetch = fixtureFetch(envelopeSuccess);
    const client = createFetchHttpClient({ baseUrl: 'https://api.test/', fetch });
    await client.send(get({ query: { q: 'Đà Lạt & Huế', page: 2, ok: true, a: undefined, b: null } }));

    const url = new URL(urlOf(fetch.mock.calls[0]?.[0] ?? ''));
    expect(`${url.origin}${url.pathname}`).toBe('https://api.test/api/v1/x');
    expect(url.searchParams.get('q')).toBe('Đà Lạt & Huế');
    expect(url.searchParams.get('page')).toBe('2');
    expect(url.searchParams.get('ok')).toBe('true');
    expect(url.searchParams.has('a')).toBe(false);
    expect(url.searchParams.has('b')).toBe(false);
  });

  it('path thiếu / đầu, không query → URL không có ?', async () => {
    const fetch = fixtureFetch(envelopeSuccess);
    await clientWith(fetch).send(get({ path: 'api/v1/x' }));
    expect(urlOf(fetch.mock.calls[0]?.[0] ?? '')).toBe('https://api.test/api/v1/x');
  });

  it('gửi header từ getHeaders, request.headers ghi đè header cùng tên', async () => {
    const fetch = fixtureFetch(envelopeSuccess);
    const client = createFetchHttpClient({
      baseUrl: 'https://api.test',
      fetch,
      getHeaders: async () => ({ Authorization: 'Bearer t', 'X-Trace': 'deps' }),
    });
    await client.send(get({ headers: { 'x-trace': 'request' } }));

    const headers = new Headers(initOf(fetch).headers);
    expect(headers.get('Authorization')).toBe('Bearer t');
    expect(headers.get('X-Trace')).toBe('request');
  });

  it('gọi fetch như hàm trần (this undefined)', async () => {
    // Giả lập trình duyệt: fetch gọi với `this` khác undefined/globalThis ném "Illegal invocation".
    const bareFetch = vi.fn(function (this: unknown): Promise<Response> {
      if (this !== undefined) return Promise.reject(new TypeError('Illegal invocation'));
      return Promise.resolve(responseOf(envelopeSuccess));
    });
    await expect(clientWith(bareFetch).send(get())).resolves.toEqual({
      id: '3f2504e0-4f89-11d3-9a0c-0305e82c3301',
      title: 'Đà Lạt',
    });
  });
});

describe('createFetchHttpClient: timeout', () => {
  it('mặc định 30 giây', () => {
    expect(DEFAULT_TIMEOUT_MS).toBe(30_000);
  });

  it('chưa settle ở 29 999 ms, reject kind timeout ở 30 000 ms', async () => {
    vi.useFakeTimers();
    const fetch = hangingFetch();
    let outcome: unknown = 'pending';
    const settled = clientWith(fetch)
      .send(get())
      .then(
        (value: unknown) => {
          outcome = value;
        },
        (error: unknown) => {
          outcome = error;
        },
      );

    await vi.advanceTimersByTimeAsync(29_999);
    expect(outcome).toBe('pending');
    await vi.advanceTimersByTimeAsync(1);
    await settled;
    expect(outcome).toEqual({ type: 'ApiError', kind: 'timeout', status: null, code: null, message: null });
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('timeout cả khi đang đọc body', async () => {
    vi.useFakeTimers();
    const slowBodyFetch = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      const slowResponse = {
        status: 200,
        text: () =>
          new Promise<string>((_resolve, reject) => {
            init?.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')), {
              once: true,
            });
          }),
      };
      return slowResponse as unknown as Response;
    });
    const settled = clientWith(slowBodyFetch).send(get()).catch((e: unknown) => e);

    await vi.advanceTimersByTimeAsync(30_000);
    await expect(settled).resolves.toMatchObject({ kind: 'timeout' });
  });

  it('deps.timeoutMs được tôn trọng', async () => {
    vi.useFakeTimers();
    const settled = clientWith(hangingFetch(), { timeoutMs: 10_000 }).send(get()).catch((e: unknown) => e);

    await vi.advanceTimersByTimeAsync(10_000);
    await expect(settled).resolves.toMatchObject({ kind: 'timeout' });
  });

  it('request.timeoutMs ưu tiên hơn deps.timeoutMs', async () => {
    vi.useFakeTimers();
    let outcome: unknown = 'pending';
    const settled = clientWith(hangingFetch(), { timeoutMs: 10_000 })
      .send(get({ timeoutMs: 5_000 }))
      .catch((e: unknown) => {
        outcome = e;
      });

    await vi.advanceTimersByTimeAsync(4_999);
    expect(outcome).toBe('pending');
    await vi.advanceTimersByTimeAsync(1);
    await settled;
    expect(outcome).toMatchObject({ kind: 'timeout' });
  });

  it('xóa timer sau request thành công', async () => {
    vi.useFakeTimers();
    await clientWith(fixtureFetch(envelopeSuccess)).send(get());
    expect(vi.getTimerCount()).toBe(0);
  });

  it('xóa timer sau request lỗi', async () => {
    vi.useFakeTimers();
    await rejection(clientWith(fixtureFetch(envelopeNotFound)).send(get()));
    expect(vi.getTimerCount()).toBe(0);
  });
});

describe('createFetchHttpClient: caller abort', () => {
  it('signal đã abort trước khi gửi → kind aborted', async () => {
    const caller = new AbortController();
    caller.abort();
    const error = await rejection(clientWith(hangingFetch()).send(get({ signal: caller.signal })));
    expect(error).toEqual({ type: 'ApiError', kind: 'aborted', status: null, code: null, message: null });
  });

  it('abort trong lúc fetch đang chờ → kind aborted, không phải timeout', async () => {
    vi.useFakeTimers();
    const caller = new AbortController();
    const settled = clientWith(hangingFetch()).send(get({ signal: caller.signal })).catch((e: unknown) => e);

    await vi.advanceTimersByTimeAsync(1_000);
    caller.abort();
    await expect(settled).resolves.toMatchObject({ kind: 'aborted' });
    expect(vi.getTimerCount()).toBe(0);
  });
});
