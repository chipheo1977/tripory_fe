// Kho phiên phía server: ghi, xóa và đọc 3 cookie phiên, giải mã claim của access token. Là nơi DUY NHẤT
// token rời server (qua Set-Cookie). Không log gì ở đây: giá trị cookie là token.
import { isFresh, STALE_AT_SEC, type Viewer } from "@tripory/identity";
import { parseAccessTokenClaims, type AccessTokenClaims } from "@tripory/identity/http";
import type { NextResponse } from "next/server";
import { sessionCookieNames } from "../session-cookies";

/** Hàm đọc một cookie theo tên: `request.cookies` và `cookies()` của Next đều bọc được. */
export type CookieGetter = (name: string) => string | undefined;

export type SessionTokens = Readonly<{
  accessToken: string;
  refreshToken: string;
  /** ISO 8601. Là hạn của REFRESH token (BE cộng cứng 7 ngày), không phải hạn của access token. */
  expiresAt: string;
}>;

const BASE64URL_SEGMENT = /^[A-Za-z0-9_-]+$/;

/**
 * Giải mã đoạn payload của JWT (không kiểm chữ ký: FE không giữ secret của BE). Dùng `Buffer` với UTF-8
 * vì `name` có dấu tiếng Việt; `atob` trả chuỗi Latin-1 và làm vỡ dấu. `null` khi token hỏng.
 */
export function decodeJwtPayload(token: string): unknown {
  const segments = token.split(".");
  const payload = segments[1];

  if (segments.length !== 3 || payload === undefined || !BASE64URL_SEGMENT.test(payload)) return null;

  try {
    return JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as unknown;
  } catch {
    return null;
  }
}

const claimsOf = (accessToken: string): AccessTokenClaims | null =>
  parseAccessTokenClaims(decodeJwtPayload(accessToken));

export type WriteSessionResult = Readonly<{ ok: true; claims: AccessTokenClaims }> | Readonly<{ ok: false }>;

/**
 * Ghi 3 cookie phiên vào response.
 *
 * - Access và refresh: `HttpOnly`, JS không đọc được (AUTH-02). `at_exp`: chỉ chứa số giây `exp`, JS đọc
 *   được để hẹn refresh chủ động.
 * - `Max-Age` của CẢ access cookie bằng hạn refresh (`expiresAt` của BE), không phải hạn access: BE cần
 *   access token đã hết hạn nằm trong body của lần refresh, nên cookie phải còn đủ lâu để mang nó tới đó
 *   (PITFALLS P2). Access hết hạn thật thì route/BFF coi là `stale`, không cần cookie tự biến mất.
 * - `Secure` + prefix `__Host-` theo `secure`; `SameSite=Lax` để mở link từ ứng dụng khác vẫn có phiên.
 *
 * Token BE trả mà không đọc được claim, hoặc `expiresAt` không parse được, là lỗi upstream: trả `ok: false`
 * và KHÔNG ghi cookie nào (không để lại phiên nửa vời).
 */
export function writeSession(
  res: NextResponse,
  tokens: SessionTokens,
  nowMs: number,
  secure: boolean,
): WriteSessionResult {
  const claims = claimsOf(tokens.accessToken);
  const expiresAtMs = Date.parse(tokens.expiresAt);

  if (claims === null || Number.isNaN(expiresAtMs)) return { ok: false };

  const names = sessionCookieNames(secure);
  const maxAge = Math.max(0, Math.floor((expiresAtMs - nowMs) / 1000));
  const base = { secure, sameSite: "lax" as const, path: "/", maxAge };

  res.cookies.set(names.access, tokens.accessToken, { ...base, httpOnly: true });
  res.cookies.set(names.refresh, tokens.refreshToken, { ...base, httpOnly: true });
  res.cookies.set(names.accessExp, String(claims.exp), { ...base, httpOnly: false });

  return { ok: true, claims };
}

/**
 * Xóa phiên bằng cách ghi lại từng cookie với ĐỦ thuộc tính cũ và `Max-Age=0`. Cố ý không dùng hàm delete
 * của Next: nó chỉ phát `Set-Cookie` có `Expires` quá khứ mà thiếu `Secure` và `Path=/`, trình duyệt từ chối
 * lệnh xóa của cookie `__Host-` thiếu hai thuộc tính đó nên đăng xuất không có tác dụng (T-03-16, Pitfall 2).
 */
export function clearSession(res: NextResponse, secure: boolean): void {
  const names = sessionCookieNames(secure);
  const base = { secure, sameSite: "lax" as const, path: "/", maxAge: 0 };

  res.cookies.set(names.access, "", { ...base, httpOnly: true });
  res.cookies.set(names.refresh, "", { ...base, httpOnly: true });
  res.cookies.set(names.accessExp, "", { ...base, httpOnly: false });
}

/** Hai token thô cho route refresh/BFF. `null` nếu thiếu hoặc rỗng một trong hai. */
export function readRawTokens(
  get: CookieGetter,
  secure: boolean,
): Readonly<{ accessToken: string; refreshToken: string }> | null {
  const names = sessionCookieNames(secure);
  const accessToken = get(names.access);
  const refreshToken = get(names.refresh);

  if (accessToken === undefined || accessToken === "" || refreshToken === undefined || refreshToken === "") {
    return null;
  }

  return { accessToken, refreshToken };
}

export type SessionState =
  | Readonly<{ state: "none" }>
  | Readonly<{ state: "invalid" }>
  | Readonly<{ state: "stale"; claims: AccessTokenClaims }>
  | Readonly<{ state: "fresh"; claims: AccessTokenClaims; accessToken: string }>;

/**
 * Phân loại phiên theo đồng hồ SERVER (`nowSec` do caller đưa vào, không đọc đồng hồ ở đây):
 * - `none`: không có cookie access (khách).
 * - `invalid`: có access nhưng thiếu refresh hoặc claim hỏng; không dùng được và không hồi phục được.
 * - `stale`: còn ≤ `STALE_AT_SEC` giây hoặc đã hết hạn; còn hồi phục được bằng refresh.
 * - `fresh`: còn > `STALE_AT_SEC` giây; dùng được làm Bearer.
 * `stale` không mang `accessToken`: route refresh dùng `readRawTokens` để lấy token thô.
 */
export function readSession(get: CookieGetter, nowSec: number, secure: boolean): SessionState {
  const names = sessionCookieNames(secure);
  const accessToken = get(names.access);

  if (accessToken === undefined || accessToken === "") return { state: "none" };

  const refreshToken = get(names.refresh);

  if (refreshToken === undefined || refreshToken === "") return { state: "invalid" };

  const claims = claimsOf(accessToken);

  if (claims === null) return { state: "invalid" };

  return isFresh(claims.exp, nowSec, STALE_AT_SEC)
    ? { state: "fresh", claims, accessToken }
    : { state: "stale", claims };
}

/**
 * Viewer để HIỂN THỊ (menu, avatar chữ cái đầu) từ claim của cookie access, kể cả khi token đã hết hạn:
 * chưa refresh xong thì header vẫn nên hiện đúng người. Không gọi BE. `avatarUrl` luôn `null` ở đây; ảnh
 * thật đến sau từ `users/me`. `null` khi không có cookie hoặc claim hỏng.
 */
export function readViewerFromCookie(get: CookieGetter, secure: boolean): Viewer | null {
  const accessToken = get(sessionCookieNames(secure).access);

  if (accessToken === undefined || accessToken === "") return null;

  const claims = claimsOf(accessToken);

  if (claims === null) return null;

  return {
    id: claims.userId,
    email: claims.email,
    fullName: claims.fullName,
    handle: claims.handle,
    avatarUrl: null,
  };
}
