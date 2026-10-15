// HTTP client phía browser (composition root). Lắp `createFetchHttpClient` + `withSessionRefresh` với
// `Lock` bằng Web Locks, và là NƠI DUY NHẤT trong app gọi route refresh phiên (Pitfall 3).
//
// Vì sao chỉ một đường: BE xoay refresh token và có reuse detection. Hai lượt refresh cùng một token
// (hai tab, hoặc request phản ứng trùng refresh chủ động) làm BE trả `Token.Compromised` và thu hồi mọi
// phiên, kể cả ở FE cũ. Mọi lời gọi refresh, dù từ 401 (withSessionRefresh) hay chủ động
// (`refreshSession`), đều chạy trong cùng một `lock` và cùng một route idempotent.
import { isApiError, makeApiError, type Lock, type RefreshOutcome } from "@tripory/api-client";
import { createFetchHttpClient, DEFAULT_SESSION_LOCK_NAME, withSessionRefresh } from "@tripory/api-client/http";
import { sessionEvents } from "./session-events.client";

/** Phần của `navigator.locks` mà module này dùng; tự khai báo để test thay bằng khóa giả. */
export type LockManagerLike = {
  request<T>(name: string, options: { signal?: AbortSignal }, callback: () => Promise<T>): Promise<T>;
};

export type BrowserHttpDeps = Readonly<{
  fetch: typeof fetch;
  /** `undefined` khi không có `navigator.locks` (không phải secure context, ví dụ mở qua IP LAN). */
  locks: LockManagerLike | undefined;
  /** Gọi tối đa một lần cho mỗi lần hết phiên thật (D-20). */
  onSessionExpired: () => void;
  /** Hạn chờ xin khóa, mặc định 40 giây (Pitfall 6). */
  lockWaitMs?: number;
}>;

export type BrowserHttp = Readonly<{
  /** Gateway đăng nhập / đăng ký / đăng xuất / đổi mật khẩu. Base `/api/auth`, bọc refresh. */
  authHttp: ReturnType<typeof withSessionRefresh>;
  /** Dữ liệu nghiệp vụ qua BFF. Base `/api/bff`, bọc refresh. */
  bffHttp: ReturnType<typeof withSessionRefresh>;
  /**
   * Lối vào duy nhất cho refresh chủ động (SessionKeeper) và hồi phục (SessionRecovery). Resolve
   * `'expired'` khi route trả 401; ném lỗi tạm thời (mạng, 5xx, hết hạn xin khóa). Không tự báo
   * `onSessionExpired`: caller quyết (qua `sessionEvents`, đã chống lặp).
   */
  refreshSession: () => Promise<RefreshOutcome>;
  lock: Lock;
}>;

const DEFAULT_LOCK_WAIT_MS = 40_000;

export function makeBrowserHttp(deps: BrowserHttpDeps): BrowserHttp {
  // Mutex trong tab khi không có `navigator.locks`: nối đuôi promise. Chỉ chặn được trong MỘT tab, nên
  // hai tab không có Web Locks vẫn có thể refresh chồng nhau; chấp nhận được vì đó chỉ là môi trường dev
  // qua http://IP-LAN, còn production luôn là HTTPS (Pitfall 5).
  let tail: Promise<unknown> = Promise.resolve();
  const fallbackLock: Lock = (_name, task) => {
    const run = tail.then(task, task);
    tail = run.catch(() => undefined);
    return run;
  };

  const lock: Lock = (name, task) => {
    const locks = deps.locks;
    if (locks === undefined) return fallbackLock(name, task);

    // Chờ khóa tối đa `lockWaitMs`: tab giữ khóa bị đóng băng (iOS nền) không được treo mọi tab khác.
    // Hết giờ thì `request()` reject AbortError; đổi thành lỗi tạm thời của app để không lọt DOMException
    // ra ngoài và không bị hiểu nhầm là hết phiên.
    const controller = new AbortController();
    let granted = false;
    const timer = setTimeout(() => controller.abort(), deps.lockWaitMs ?? DEFAULT_LOCK_WAIT_MS);

    return locks
      .request(name, { signal: controller.signal }, () => {
        granted = true;
        clearTimeout(timer);
        return task();
      })
      .catch((error: unknown) => {
        // Lỗi của chính tác vụ trong khóa (đã `granted`) lan nguyên: đó là lỗi refresh, không phải hết hạn xin khóa.
        if (!granted && controller.signal.aborted) {
          throw makeApiError({ kind: 'timeout', status: null, code: null, message: null });
        }
        throw error;
      })
      .finally(() => clearTimeout(timer));
  };

  // Client trần, KHÔNG bọc `withSessionRefresh`: bọc thì refresh gặp 401 sẽ gọi lại refresh (đệ quy).
  const authRawHttp = createFetchHttpClient({ baseUrl: "/api/auth", fetch: deps.fetch });

  async function callRefreshRoute(): Promise<RefreshOutcome> {
    // Luôn hỏi route, KHÔNG tự bỏ qua theo cookie `at_exp` + đồng hồ máy: máy chạy chậm hơn server hơn 2
    // phút sẽ tưởng token còn tươi, trả 'refreshed' giả, phát lại vẫn 401 và đăng xuất oan. Route quyết
    // định bằng đồng hồ server và no-op khi cookie đã tươi (tab khác vừa refresh).
    try {
      await authRawHttp.send({ method: "POST", path: "/refresh", sessionRefresh: false });
      return "refreshed";
    } catch (error) {
      if (isApiError(error) && error.status === 401) return "expired";
      // 503, mạng, timeout: lỗi tạm thời, giữ phiên (D-14a).
      throw error;
    }
  }

  const refreshDeps = { refresh: callRefreshRoute, lock, onSessionExpired: deps.onSessionExpired };

  // `withSessionRefresh` có `epoch`/`inFlight` riêng cho từng client bọc, `refreshSession` có `inFlight`
  // riêng. Cả ba cùng chạy trong `lock` và route idempotent (no-op khi access token còn hơn 150 giây), nên
  // mỗi lần hết hạn chỉ có tối đa một lần gọi BE.
  const authHttp = withSessionRefresh(createFetchHttpClient({ baseUrl: "/api/auth", fetch: deps.fetch }), refreshDeps);
  const bffHttp = withSessionRefresh(createFetchHttpClient({ baseUrl: "/api/bff", fetch: deps.fetch }), refreshDeps);

  let inFlight: Promise<RefreshOutcome> | null = null;
  const refreshSession = (): Promise<RefreshOutcome> =>
    (inFlight ??= lock(DEFAULT_SESSION_LOCK_NAME, callRefreshRoute).finally(() => {
      inFlight = null;
    }));

  return { authHttp, bffHttp, refreshSession, lock };
}

// Singleton có chủ đích: một khóa và một `inFlight` cho cả tab. Hai bản `makeBrowserHttp` trong cùng tab
// sẽ có `inFlight` riêng và chỉ còn dựa vào `lock` + route idempotent. `fetch` bọc bằng arrow để không đọc
// `globalThis.fetch` lúc import (SSR, test) và để gọi như hàm trần, tránh "Illegal invocation".
export const { authHttp, bffHttp, refreshSession } = makeBrowserHttp({
  fetch: (...args) => globalThis.fetch(...args),
  locks: typeof navigator === "undefined" ? undefined : navigator.locks,
  onSessionExpired: () => sessionEvents.emitExpired(),
});
