// Tên cookie phiên, dùng chung cho proxy.ts, code server (route/BFF) và code client (SessionKeeper).
// Vì vậy file này không import API đọc cookie của Next phía server hay package đánh dấu module chỉ-server:
// chỉ hằng và hàm thuần.
//
// Production dùng prefix `__Host-`: trình duyệt chỉ nhận cookie này khi có `Secure`, `Path=/` và KHÔNG
// có `Domain`, nên subdomain khác không ghi đè được ("cookie tossing").
//
// Dev qua http:// bỏ prefix và bỏ `Secure`: Safari không chấp nhận `__Host-`/`Secure` trên http://localhost,
// và mở từ điện thoại qua IP LAN (http://192.168.x.x:3000) thì trình duyệt nào cũng từ chối. Muốn thử
// prefix ở máy dev thì chạy `next dev --experimental-https`.

export type SessionCookieNames = Readonly<{
  /** JWT access token, HttpOnly. */
  access: string;
  /** Refresh token, HttpOnly. */
  refresh: string;
  /**
   * `exp` của access token (số nguyên giây), JS đọc được. Chỉ là một con số để hẹn refresh chủ động trước
   * hạn, không phải token và không cho phép làm gì; quyết định có refresh hay không luôn do route (đồng hồ
   * server).
   */
  accessExp: string;
}>;

// Viết tên đầy đủ (không ghép prefix) để grep được tên cookie thật khi debug trên trình duyệt.
const SECURE_NAMES: SessionCookieNames = {
  access: "__Host-tripory_at",
  refresh: "__Host-tripory_rt",
  accessExp: "__Host-tripory_at_exp",
};

const PLAIN_NAMES: SessionCookieNames = {
  access: "tripory_at",
  refresh: "tripory_rt",
  accessExp: "tripory_at_exp",
};

export function sessionCookieNames(secure: boolean): SessionCookieNames {
  return secure ? SECURE_NAMES : PLAIN_NAMES;
}

/** Production chạy trên HTTPS nên bật `Secure` + prefix; dev/test thì không. */
export function isSecureCookieEnv(): boolean {
  return process.env.NODE_ENV === "production";
}

/**
 * Có cookie phiên hay không, chỉ để proxy.ts redirect lạc quan (D-25). Chỉ kiểm cookie access: Max-Age của
 * nó bằng hạn refresh, nên còn cookie nghĩa là còn phiên (access hết hạn nhưng refresh còn vẫn được phục
 * hồi ở client). Proxy không verify gì: quyền thật do BE xác thực Bearer.
 */
export function hasSessionCookie(cookies: Readonly<{ has(name: string): boolean }>, secure: boolean): boolean {
  return cookies.has(sessionCookieNames(secure).access);
}

/**
 * Đọc `exp` (giây) từ chuỗi `document.cookie`. `null` khi thiếu hoặc không phải số nguyên dương an toàn.
 * Khớp theo tên đầy đủ nên `x_tripory_at_exp` không bị nhận nhầm.
 */
export function readAccessExpFromCookieString(cookieString: string, secure: boolean): number | null {
  const name = sessionCookieNames(secure).accessExp;

  for (const part of cookieString.split(";")) {
    const pair = part.trim();
    const separator = pair.indexOf("=");

    if (separator === -1 || pair.slice(0, separator) !== name) continue;

    const raw = pair.slice(separator + 1);

    if (!/^\d+$/.test(raw)) return null;

    const value = Number(raw);

    return Number.isSafeInteger(value) && value > 0 ? value : null;
  }

  return null;
}
