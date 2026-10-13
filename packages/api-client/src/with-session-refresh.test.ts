import { describe, expect, it, vi } from 'vitest';
import { makeApiError } from './api-error';
import type { HttpClient, HttpRequest } from './http-client';
import { DEFAULT_SESSION_LOCK_NAME, withSessionRefresh, type Lock, type RefreshOutcome } from './with-session-refresh';

type Deferred<T> = Readonly<{
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason: unknown) => void;
}>;

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

const unauthorized = () => makeApiError({ kind: 'http', status: 401, code: null, message: null });

const get = (path: string, extra: Partial<HttpRequest> = {}): HttpRequest => ({ method: 'GET', path, ...extra });

/** Lượt 1 của mỗi path reject 401, các lượt sau resolve `{ ok: path }`. */
function firstCall401() {
  const calls = new Map<string, number>();
  const send = vi.fn(async (request: HttpRequest): Promise<unknown> => {
    const count = (calls.get(request.path) ?? 0) + 1;
    calls.set(request.path, count);
    if (count === 1) throw unauthorized();
    return { ok: request.path };
  });
  const inner: HttpClient = { send };
  return { inner, send, calls };
}

function makeDeps(refresh: () => Promise<RefreshOutcome>, lockName?: string) {
  const lock = vi.fn(<T>(_name: string, task: () => Promise<T>) => task());
  const refreshFn = vi.fn(refresh);
  const onSessionExpired = vi.fn();
  const deps = {
    refresh: refreshFn,
    lock: lock as unknown as Lock,
    onSessionExpired,
    ...(lockName === undefined ? {} : { lockName }),
  };
  return { deps, lock, refresh: refreshFn, onSessionExpired };
}

describe('withSessionRefresh: single-flight', () => {
  it('N=5 request 401 song song chỉ lock và refresh 1 lần, mỗi request phát lại 1 lần', async () => {
    const { inner, send } = firstCall401();
    const pending = deferred<RefreshOutcome>();
    const { deps, lock, refresh } = makeDeps(() => pending.promise);
    const client = withSessionRefresh(inner, deps);

    const paths = ['/a', '/b', '/c', '/d', '/e'];
    const results = Promise.all(paths.map((path) => client.send(get(path))));

    await vi.waitFor(() => expect(refresh).toHaveBeenCalledTimes(1));
    await Promise.resolve();
    pending.resolve('refreshed');

    await expect(results).resolves.toEqual(paths.map((path) => ({ ok: path })));
    expect(lock).toHaveBeenCalledTimes(1);
    expect(lock.mock.calls[0]?.[0]).toBe('tripory-session-refresh');
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledTimes(10);
  });

  it('DEFAULT_SESSION_LOCK_NAME là tripory-session-refresh', () => {
    expect(DEFAULT_SESSION_LOCK_NAME).toBe('tripory-session-refresh');
  });

  it('lockName tùy chỉnh được truyền cho lock', async () => {
    const { inner } = firstCall401();
    const { deps, lock } = makeDeps(async () => 'refreshed', 'custom-lock');
    const client = withSessionRefresh(inner, deps);

    await expect(client.send(get('/a'))).resolves.toEqual({ ok: '/a' });
    expect(lock).toHaveBeenCalledTimes(1);
    expect(lock.mock.calls[0]?.[0]).toBe('custom-lock');
  });
});

describe('withSessionRefresh: epoch', () => {
  it('401 đến muộn sau khi refresh xong (epoch đã tăng) chỉ phát lại, không refresh lần hai', async () => {
    const slowFirst = deferred<unknown>();
    const callsA = { count: 0 };
    const callsB = { count: 0 };
    const send = vi.fn(async (request: HttpRequest): Promise<unknown> => {
      if (request.path === '/a') {
        callsA.count += 1;
        if (callsA.count === 1) return slowFirst.promise;
        return { ok: '/a' };
      }
      callsB.count += 1;
      if (callsB.count === 1) throw unauthorized();
      return { ok: '/b' };
    });
    const { deps, refresh } = makeDeps(async () => 'refreshed');
    const client = withSessionRefresh({ send }, deps);

    const resultA = client.send(get('/a'));
    await expect(client.send(get('/b'))).resolves.toEqual({ ok: '/b' });
    expect(refresh).toHaveBeenCalledTimes(1);

    slowFirst.reject(unauthorized());
    await expect(resultA).resolves.toEqual({ ok: '/a' });
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(callsA.count).toBe(2);
  });

  it('hai lượt 401 tuần tự ở hai epoch khác nhau thì refresh 2 lần', async () => {
    const { inner } = firstCall401();
    const { deps, refresh } = makeDeps(async () => 'refreshed');
    const client = withSessionRefresh(inner, deps);

    await expect(client.send(get('/one'))).resolves.toEqual({ ok: '/one' });
    await expect(client.send(get('/two'))).resolves.toEqual({ ok: '/two' });
    expect(refresh).toHaveBeenCalledTimes(2);
  });
});

describe('withSessionRefresh: không vào nhánh refresh', () => {
  it('không có 401 thì gửi 1 lần và trả nguyên kết quả', async () => {
    const send = vi.fn(async () => ({ ok: true }));
    const { deps, refresh, lock } = makeDeps(async () => 'refreshed');
    const client = withSessionRefresh({ send }, deps);

    await expect(client.send(get('/a'))).resolves.toEqual({ ok: true });
    expect(send).toHaveBeenCalledTimes(1);
    expect(refresh).toHaveBeenCalledTimes(0);
    expect(lock).toHaveBeenCalledTimes(0);
  });

  it.each([
    { name: 'ApiError 500', error: makeApiError({ kind: 'http', status: 500, code: null, message: null }) },
    { name: 'ApiError network', error: makeApiError({ kind: 'network', status: null, code: null, message: null }) },
    { name: 'TypeError', error: new TypeError('x') },
  ])('lỗi khác 401 ($name) đi thẳng, không refresh', async ({ error }) => {
    const send = vi.fn(async () => {
      throw error;
    });
    const { deps, refresh } = makeDeps(async () => 'refreshed');
    const client = withSessionRefresh({ send }, deps);

    await expect(client.send(get('/a'))).rejects.toBe(error);
    expect(refresh).toHaveBeenCalledTimes(0);
    expect(send).toHaveBeenCalledTimes(1);
  });

  it('sessionRefresh: false + 401 trả lỗi gốc, không refresh', async () => {
    const original = unauthorized();
    const send = vi.fn(async () => {
      throw original;
    });
    const { deps, refresh } = makeDeps(async () => 'refreshed');
    const client = withSessionRefresh({ send }, deps);

    await expect(client.send(get('/api/auth/login', { method: 'POST', sessionRefresh: false }))).rejects.toBe(original);
    expect(refresh).toHaveBeenCalledTimes(0);
    expect(send).toHaveBeenCalledTimes(1);
  });
});

describe('withSessionRefresh: hết phiên và lỗi tạm thời (D-14, D-14a)', () => {
  it("refresh trả 'expired' → cả lô reject session.expired, onSessionExpired gọi 1 lần", async () => {
    const { inner, send } = firstCall401();
    const pending = deferred<RefreshOutcome>();
    const { deps, refresh, onSessionExpired } = makeDeps(() => pending.promise);
    const client = withSessionRefresh(inner, deps);

    const results = ['/a', '/b', '/c'].map((path) => client.send(get(path)));
    await vi.waitFor(() => expect(send).toHaveBeenCalledTimes(3));
    pending.resolve('expired');

    const expected = { type: 'ApiError', kind: 'session_expired', status: 401, code: 'session.expired', message: null };
    await Promise.all(results.map((result) => expect(result).rejects.toEqual(expected)));
    expect(onSessionExpired).toHaveBeenCalledTimes(1);
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledTimes(3);
  });

  it("401 đến muộn sau lô 'expired' (cùng epoch) → session.expired, không refresh và không báo lần hai", async () => {
    const slowThird = deferred<unknown>();
    const send = vi.fn(async (request: HttpRequest): Promise<unknown> => {
      if (request.path === '/c') return slowThird.promise;
      throw unauthorized();
    });
    const { deps, refresh, onSessionExpired } = makeDeps(async () => 'expired');
    const client = withSessionRefresh({ send }, deps);

    const resultC = client.send(get('/c'));
    const batch = ['/a', '/b'].map((path) => client.send(get(path)));
    await Promise.all(batch.map((result) => expect(result).rejects.toMatchObject({ code: 'session.expired' })));
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(onSessionExpired).toHaveBeenCalledTimes(1);

    slowThird.reject(unauthorized());
    await expect(resultC).rejects.toMatchObject({ kind: 'session_expired', code: 'session.expired' });
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(onSessionExpired).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledTimes(3);
  });

  it('đăng nhập lại (sessionRefresh: false thành công) sau hết phiên → 401 kế tiếp refresh bình thường', async () => {
    let loggedIn = false;
    const calls = new Map<string, number>();
    const send = vi.fn(async (request: HttpRequest): Promise<unknown> => {
      if (request.sessionRefresh === false) {
        loggedIn = true;
        return { ok: 'login' };
      }
      const count = (calls.get(request.path) ?? 0) + 1;
      calls.set(request.path, count);
      if (count === 1) throw unauthorized();
      return { ok: request.path };
    });
    let attempt = 0;
    const { deps, refresh, onSessionExpired } = makeDeps(async () => {
      attempt += 1;
      return attempt === 1 ? 'expired' : 'refreshed';
    });
    const client = withSessionRefresh({ send }, deps);

    await expect(client.send(get('/a'))).rejects.toMatchObject({ code: 'session.expired' });
    expect(onSessionExpired).toHaveBeenCalledTimes(1);

    await client.send(get('/api/auth/login', { method: 'POST', sessionRefresh: false }));
    expect(loggedIn).toBe(true);

    await expect(client.send(get('/b'))).resolves.toEqual({ ok: '/b' });
    expect(refresh).toHaveBeenCalledTimes(2);
    expect(onSessionExpired).toHaveBeenCalledTimes(1);
  });

  it('refresh ném lỗi tạm thời → cả lô nhận đúng lỗi đó, không đăng xuất, lần 401 sau refresh lại', async () => {
    const transient = makeApiError({ kind: 'network', status: null, code: null, message: null });
    const { inner } = firstCall401();
    const pending = deferred<RefreshOutcome>();
    let attempt = 0;
    const { deps, refresh, onSessionExpired } = makeDeps(() => {
      attempt += 1;
      return attempt === 1 ? pending.promise : Promise.resolve('refreshed');
    });
    const client = withSessionRefresh(inner, deps);

    const results = ['/a', '/b', '/c'].map((path) => client.send(get(path)));
    await vi.waitFor(() => expect(refresh).toHaveBeenCalledTimes(1));
    await Promise.resolve();
    pending.reject(transient);

    await Promise.all(results.map((result) => expect(result).rejects.toBe(transient)));
    expect(onSessionExpired).toHaveBeenCalledTimes(0);

    await expect(client.send(get('/d'))).resolves.toEqual({ ok: '/d' });
    expect(refresh).toHaveBeenCalledTimes(2);
    expect(onSessionExpired).toHaveBeenCalledTimes(0);
  });

  it('refresh ném ApiError 503 (cold start) → request nhận đúng lỗi 503, không đăng xuất', async () => {
    const coldStart = makeApiError({ kind: 'http', status: 503, code: null, message: null });
    const { inner } = firstCall401();
    const { deps, onSessionExpired } = makeDeps(() => Promise.reject(coldStart));
    const client = withSessionRefresh(inner, deps);

    await expect(client.send(get('/a'))).rejects.toBe(coldStart);
    expect(onSessionExpired).toHaveBeenCalledTimes(0);
  });
});

describe('withSessionRefresh: phát lại', () => {
  it('phát lại vẫn 401 → session.expired, gọi onSessionExpired 1 lần, không refresh lần hai', async () => {
    const send = vi.fn(async () => {
      throw unauthorized();
    });
    const { deps, refresh, onSessionExpired } = makeDeps(async () => 'refreshed');
    const client = withSessionRefresh({ send }, deps);

    await expect(client.send(get('/a'))).rejects.toMatchObject({ kind: 'session_expired', code: 'session.expired' });
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledTimes(2);
    expect(onSessionExpired).toHaveBeenCalledTimes(1);
  });

  it('nhiều request phát lại vẫn 401 trong cùng lô → onSessionExpired chỉ 1 lần, 401 sau đó đi tắt', async () => {
    const send = vi.fn(async () => {
      throw unauthorized();
    });
    const pending = deferred<RefreshOutcome>();
    const { deps, refresh, onSessionExpired } = makeDeps(() => pending.promise);
    const client = withSessionRefresh({ send }, deps);

    const results = ['/a', '/b', '/c'].map((path) => client.send(get(path)));
    await vi.waitFor(() => expect(send).toHaveBeenCalledTimes(3));
    pending.resolve('refreshed');
    await Promise.all(results.map((result) => expect(result).rejects.toMatchObject({ code: 'session.expired' })));
    expect(onSessionExpired).toHaveBeenCalledTimes(1);

    await expect(client.send(get('/d'))).rejects.toMatchObject({ code: 'session.expired' });
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(onSessionExpired).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledTimes(7);
  });

  it('phát lại lỗi khác (500) → reject đúng lỗi đó', async () => {
    const serverError = makeApiError({ kind: 'http', status: 500, code: null, message: null });
    let count = 0;
    const send = vi.fn(async () => {
      count += 1;
      throw count === 1 ? unauthorized() : serverError;
    });
    const { deps, onSessionExpired } = makeDeps(async () => 'refreshed');
    const client = withSessionRefresh({ send }, deps);

    await expect(client.send(get('/a'))).rejects.toBe(serverError);
    expect(onSessionExpired).toHaveBeenCalledTimes(0);
  });

  it('caller abort trong lúc chờ refresh → aborted, không phát lại', async () => {
    const { inner, send } = firstCall401();
    const pending = deferred<RefreshOutcome>();
    const { deps, onSessionExpired } = makeDeps(() => pending.promise);
    const client = withSessionRefresh(inner, deps);
    const controller = new AbortController();

    const result = client.send(get('/a', { signal: controller.signal }));
    await vi.waitFor(() => expect(send).toHaveBeenCalledTimes(1));
    controller.abort();
    pending.resolve('refreshed');

    await expect(result).rejects.toMatchObject({ type: 'ApiError', kind: 'aborted' });
    expect(send).toHaveBeenCalledTimes(1);
    expect(onSessionExpired).toHaveBeenCalledTimes(0);
  });
});
