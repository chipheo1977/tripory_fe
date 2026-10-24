import { parseUserId, type UserId } from '@tripory/shared-kernel';
import { z } from 'zod';

// Tên claim đọc từ payload thật của BE (03-RESEARCH.md §Tên claim JWT): `JwtSecurityToken(...)` giữ nguyên
// `ClaimTypes.*` nên id và email là URI dài, không có `sub`. Vẫn nhận dạng ngắn (`nameid`/`sub`/`email`) để
// không vỡ nếu BE đổi handler hoặc bật outbound claim map. URI luôn ưu tiên hơn dạng ngắn.
const URI_NAMEID = 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier';
const URI_EMAIL = 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress';

const rawClaims = z.object({
  [URI_NAMEID]: z.string().optional(),
  nameid: z.string().optional(),
  sub: z.string().optional(),
  [URI_EMAIL]: z.string().optional(),
  email: z.string().optional(),
  name: z.string().default(''),
  handle: z.string().default(''),
  exp: z.number().int().positive(),
});

export type AccessTokenClaims = Readonly<{
  userId: UserId;
  email: string;
  fullName: string;
  handle: string;
  /** Giây kể từ epoch (claim `exp` của JWT), là hạn của access token. */
  exp: number;
}>;

/**
 * Đọc claim từ payload JWT đã giải mã (object JSON). Giải mã base64 thuộc composition của server vì cần API
 * của Node; package này không đụng tới chuỗi token. `null` khi thiếu id, id không phải GUID, thiếu email hoặc
 * `exp` không phải số nguyên dương.
 *
 * Chữ ký KHÔNG được kiểm: FE không giữ secret của BE (T-03-11). Kết quả chỉ để hiển thị menu và đoán độ
 * tươi của token; quyền thật do BE xác thực Bearer.
 */
export function parseAccessTokenClaims(payload: unknown): AccessTokenClaims | null {
  const parsed = rawClaims.safeParse(payload);

  if (!parsed.success) return null;

  const claims = parsed.data;
  const userId = parseUserId(claims[URI_NAMEID] ?? claims.nameid ?? claims.sub ?? '');
  const email = claims[URI_EMAIL] ?? claims.email ?? '';

  if (userId === null || email === '') return null;

  return { userId, email, fullName: claims.name, handle: claims.handle, exp: claims.exp };
}
