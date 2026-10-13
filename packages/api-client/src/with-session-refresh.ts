import { isApiError, makeApiError, sessionExpiredError } from './api-error';
import type { HttpClient } from './http-client';

/**
 * Khóa loại trừ tương hỗ do app tiêm vào. Chữ ký khớp `locks.request(name, callback)` của Web
 * Locks API để Phase 3 cài cho nhiều tab; package này không chạm browser global (lint
 * `httpPackage()`).
 */
export type Lock = <T>(name: string, task: () => Promise<T>) => Promise<T>;

/**
 * `'expired'` chỉ khi BE xác nhận hết phiên (`Token.Expired`, `Token.Compromised`,
 * `Token.Invalid*`, `Token.UserUnavailable`). Lỗi tạm thời (mạng, timeout, 5xx/cold start) thì
 * hàm refresh THROW, không trả `'expired'` (D-14a).
 */
export type RefreshOutcome = 'refreshed' | 'expired';

export type SessionRefreshDeps = Readonly<{
  /**
   * Phase 3: gọi `/api/auth/refresh`. KHÔNG được đi qua client đã bọc `withSessionRefresh`
   * (gây đệ quy): dùng client `inner` hoặc fetch riêng với `sessionRefresh: false`.
   */
  refresh: () => Promise<RefreshOutcome>;
  lock: Lock;
  /**
   * Gọi tối đa một lần cho mỗi lần hết phiên (theo epoch), kể cả 401 đến muộn sau lô `'expired'`.
   * Phase 3 chuyển trang đăng nhập.
   */
  onSessionExpired: () => void;
  /** Mặc định DEFAULT_SESSION_LOCK_NAME. */
  lockName?: string;
}>;

export const DEFAULT_SESSION_LOCK_NAME = 'tripory-session-refresh';

/**
 * Decorator của `HttpClient` làm refresh phản ứng khi gặp 401 (D-13). Mọi request 401 dùng chung
 * một promise refresh (single-flight) chạy trong `Lock`, rồi mỗi request được phát lại đúng một
 * lần. Refresh chủ động trước hạn không làm ở đây (D-15, Phase 3).
 */
export function withSessionRefresh(inner: HttpClient, deps: SessionRefreshDeps): HttpClient {
  // State nằm trong closure, không ở module scope: mỗi client bọc có state riêng, test không rò
  // state sang nhau (phản mẫu `isRefreshing`/`failedQueue` toàn cục của FE cũ).
  //
  // `epoch` tăng mỗi lần refresh thành công. Request A gửi trước lượt refresh nhưng nhận 401 sau
  // khi lượt đó xong và `inFlight` đã về null: không có epoch thì A khởi động refresh lần hai
  // bằng refresh token vừa bị xoay, BE coi là reuse (`Token.Compromised`) và thu hồi mọi phiên.
  // Có epoch thì A thấy phiên đã được làm mới và chỉ phát lại.
  let epoch = 0;
  let inFlight: Promise<RefreshOutcome> | null = null;
  // Epoch đã được xác nhận hết phiên. Request gửi ở epoch này mà nhận 401 muộn (sau khi lô
  // `'expired'` xong, `inFlight` đã về null) đi tắt ra `session.expired`, không refresh lần hai
  // bằng refresh token BE đã từ chối và không gọi `onSessionExpired` lần hai (D-14).
  let expiredAt: number | null = null;

  const notifyExpired = (): void => {
    if (expiredAt === epoch) return;
    expiredAt = epoch;
    deps.onSessionExpired();
  };

  const refreshOnce = (): Promise<RefreshOutcome> =>
    (inFlight ??= deps
      .lock(deps.lockName ?? DEFAULT_SESSION_LOCK_NAME, deps.refresh)
      .then((outcome) => {
        // Nằm trong `.then` của promise dùng chung nên chỉ chạy một lần cho cả lô (D-14).
        if (outcome === 'refreshed') epoch += 1;
        else notifyExpired();
        return outcome;
      })
      // Lỗi ném từ refresh/lock lan nguyên tới mọi request đang chờ; reset để lần 401 sau
      // refresh lại được (D-14a).
      .finally(() => {
        inFlight = null;
      }));

  return {
    async send(request) {
      // login/register/refresh không bao giờ vào nhánh refresh (tránh vòng lặp).
      if (request.sessionRefresh === false) {
        const response = await inner.send(request);
        // login/register thành công sau khi hết phiên mở phiên mới: sang epoch mới để 401 kế tiếp
        // được refresh bình thường thay vì đi tắt ra `session.expired`.
        if (expiredAt === epoch) {
          epoch += 1;
          expiredAt = null;
        }
        return response;
      }

      const sentAt = epoch;
      try {
        return await inner.send(request);
      } catch (error) {
        if (!isApiError(error) || error.status !== 401) throw error;

        if (epoch === sentAt) {
          // Epoch này đã hết phiên (đã báo `onSessionExpired`): không refresh, không báo lại.
          if (expiredAt === sentAt) throw sessionExpiredError();
          // Cách đọc D-14a: chỉ `'expired'` mới đăng xuất. Refresh throw (lỗi tạm thời) thì lỗi
          // gốc lan tới caller để app hiện câu chung D-04, không đăng xuất oan khi BE cold start.
          const outcome = await refreshOnce();
          if (outcome === 'expired') throw sessionExpiredError();
        }

        // Caller đã hủy trong lúc chờ refresh: không phát lại request không còn ai cần.
        if (request.signal?.aborted) throw makeApiError({ kind: 'aborted', status: null, code: null, message: null });

        // Phát lại đúng một lần; vẫn 401 thì coi là hết phiên, không refresh lần hai. Vẫn báo
        // `onSessionExpired` để `session.expired` luôn đi cùng callback (D-14): app nuốt toast
        // `session_expired`, thiếu callback thì người dùng không thấy phản hồi nào.
        try {
          return await inner.send(request);
        } catch (replayError) {
          if (isApiError(replayError) && replayError.status === 401) {
            notifyExpired();
            throw sessionExpiredError();
          }
          throw replayError;
        }
      }
    },
  };
}
