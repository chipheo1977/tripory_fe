// Fixture phản hồi auth của BE dùng chung cho test route, BFF và proxy (plan 03-05, 03-07, 03-08, 03-09, 03-13).
// Cố ý KHÔNG import `vitest` để dùng được ở cả môi trường node lẫn jsdom. Dữ liệu theo contract thật của BE
// (03-RESEARCH.md §Contract BE và §Tên claim JWT). Bản tương tự trong `packages/identity` không import xuyên
// package bằng đường tương đối được, nên app giữ bản riêng.
//
// Token ở đây là JWT giả: payload đúng dạng claim thật nhưng chữ ký là chuỗi bất kỳ (FE không kiểm chữ ký).

const TIMESTAMP = "2026-10-13T08:00:00+00:00";
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

/** Id người dùng của mọi fixture, chữ thường như BE ghi. */
export const TEST_USER_ID = "3f2504e0-4f89-11d3-9a0c-0305e82c3301";

const URI_NAMEID = "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier";
const URI_EMAIL = "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress";
const URI_ROLE = "http://schemas.microsoft.com/ws/2008/06/identity/claims/role";

/** `header.base64url(JSON payload).sig`. Dùng `Buffer` để tiếng Việt có dấu đi qua UTF-8 đúng. */
export function fakeJwt(payload: Record<string, unknown>): string {
  const encode = (value: unknown) => Buffer.from(JSON.stringify(value), "utf8").toString("base64url");

  return `${encode({ alg: "HS256", typ: "JWT" })}.${encode(payload)}.fake-signature`;
}

/** Payload JWT access token thật của BE: claim dạng URI dài, không có `sub`, không có avatar. */
export function claimsPayload(overrides: { exp?: number; name?: string } = {}): Record<string, unknown> {
  return {
    [URI_NAMEID]: TEST_USER_ID,
    [URI_EMAIL]: "a@b.vn",
    handle: "a",
    name: overrides.name ?? "Nguyễn Văn Ánh",
    [URI_ROLE]: "Traveler",
    exp: overrides.exp ?? 1791890410,
    iss: "TriporyBackend",
    aud: "TriporyClientApp",
  };
}

export type BearerPair = Readonly<{
  accessToken: string;
  refreshToken: string;
  /** ISO 8601: hạn của REFRESH token (now + 7 ngày), không phải hạn access. */
  expiresAt: string;
}>;

/**
 * Cặp token BE trả: access hết hạn sau `expiresInSec` giây kể từ `nowSec`, refresh/`expiresAt` +7 ngày.
 * `suffix` làm refresh token khác nhau giữa các lần xoay trong test.
 */
export function bearerPair(nowSec: number, expiresInSec: number, suffix = "1"): BearerPair {
  return {
    accessToken: fakeJwt(claimsPayload({ exp: nowSec + expiresInSec })),
    refreshToken: `fake-refresh-token-${suffix}`,
    expiresAt: new Date(nowSec * 1000 + SEVEN_DAYS_MS).toISOString(),
  };
}

export type BeEnvelope = Readonly<{
  status: "success" | "error";
  data: unknown;
  message: string | null;
  errorCode: string | null;
  timestamp: string;
}>;

const successEnvelope = (data: unknown): BeEnvelope => ({
  status: "success",
  data,
  message: null,
  errorCode: null,
  timestamp: TIMESTAMP,
});

/** Envelope lỗi cùng dạng BE: `{ status: 'error', data: null, message, errorCode, timestamp }`. */
export const beErrorEnvelope = (errorCode: string, message: string): BeEnvelope => ({
  status: "error",
  data: null,
  message,
  errorCode,
  timestamp: TIMESTAMP,
});

/** `data` của `UserDto` trong `AuthResponse`. Avatar là ảnh mặc định chung của BE. */
const userDto = {
  id: TEST_USER_ID,
  email: "a@b.vn",
  handle: "a",
  fullName: "Nguyễn Văn Ánh",
  bio: null,
  avatarUrl: "https://api.dicebear.com/7.x/identicon/svg?seed=tripory",
  status: "Active",
  roles: ["Traveler"],
} as const;

/** Phản hồi thành công của `POST /auth/login` và `POST /auth/register` (`AuthResponse`, có `user`). */
export const beAuthResponse = (pair: BearerPair): BeEnvelope => successEnvelope({ ...pair, user: userDto });

/** Phản hồi thành công của `POST /auth/refresh-token` (`TokenResponse`, không có `user`). */
export const beTokenResponse = (pair: BearerPair): BeEnvelope => successEnvelope({ ...pair });

/** `refresh-token` 400: refresh token không có trong DB. */
export const tokenInvalidRefreshTokenEnvelope = beErrorEnvelope(
  "Token.InvalidRefreshToken",
  "RefreshToken không tồn tại.",
);

/** `refresh-token` 400: token đã thu hồi bị dùng lại, BE thu hồi mọi phiên. */
export const tokenCompromisedEnvelope = beErrorEnvelope(
  "Token.Compromised",
  "Phiên đăng nhập bị xâm phạm, vui lòng đăng nhập lại.",
);

/** `refresh-token` 400: refresh token hết hạn. */
export const tokenExpiredEnvelope = beErrorEnvelope(
  "Token.Expired",
  "RefreshToken đã hết hạn, vui lòng đăng nhập lại.",
);

/** `login` 400, cả khi email sai dạng. */
export const authInvalidCredentialsEnvelope = beErrorEnvelope(
  "Auth.InvalidCredentials",
  "Tài khoản hoặc mật khẩu không chính xác.",
);

/** `change-password` 400: sai mật khẩu hiện tại. */
export const authInvalidCurrentPasswordEnvelope = beErrorEnvelope(
  "Auth.InvalidCurrentPassword",
  "Mật khẩu hiện tại không chính xác.",
);

/** `change-password` 400 từ FluentValidation: mật khẩu mới trùng mật khẩu cũ. */
export const notEqualValidatorEnvelope = beErrorEnvelope(
  "NotEqualValidator",
  "Mật khẩu mới không được trùng với mật khẩu hiện tại.",
);

/** `register` 409: email đã có người dùng. */
export const userEmailAlreadyExistsEnvelope = beErrorEnvelope(
  "User.EmailAlreadyExists",
  "Email này đã được đăng ký trong hệ thống.",
);

/** `Response` JSON như BE trả, để làm kết quả của fake fetch. */
export const jsonResponse = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
