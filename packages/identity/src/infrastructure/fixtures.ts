// Dữ liệu thật của BE (tripory_be, đọc ngày 2026-10-13) dùng làm fixture test của package này.
// Nguồn: 03-RESEARCH.md §Contract BE và §Tên claim JWT (payload lấy từ lần chạy thử đúng
// `JwtTokenService.GenerateAccessToken`). Không import `vitest`, không export ra barrel nào.
// Test ở `apps/web` có bản riêng (`src/test/be-auth-fixtures.ts`) vì không import xuyên package bằng đường tương đối.

const TIMESTAMP = '2026-10-13T08:00:00+00:00';

/** Id người dùng của mọi fixture, chữ thường như BE ghi. */
export const userIdFixture = '3f2504e0-4f89-11d3-9a0c-0305e82c3301';

/** Avatar mặc định chung của BE (`User.cs:11,19,54`): mọi người chưa đổi ảnh có cùng một URL. */
const DEFAULT_AVATAR = 'https://api.dicebear.com/7.x/identicon/svg?seed=tripory';

/** Payload JWT access token thật: claim dạng URI dài, không có `sub`/`iat`/`nbf`, không có avatar. */
export const jwtPayloadFixture = {
  'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier': userIdFixture,
  'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress': 'a@b.vn',
  handle: 'a',
  name: 'Nguyễn Văn Ánh',
  'http://schemas.microsoft.com/ws/2008/06/identity/claims/role': 'Traveler',
  exp: 1791890410,
  iss: 'TriporyBackend',
  aud: 'TriporyClientApp',
} as const;

/** Dạng ngắn (nếu BE chuyển sang `JsonWebTokenHandler` hoặc bật outbound claim map). */
export const jwtPayloadShortFixture = {
  nameid: userIdFixture,
  email: 'a@b.vn',
  handle: 'a',
  name: 'Nguyễn Văn Ánh',
  exp: 1791890410,
} as const;

const userFixture = {
  id: userIdFixture,
  email: 'a@b.vn',
  handle: 'a',
  fullName: 'Nguyễn Văn Ánh',
  bio: null,
  avatarUrl: DEFAULT_AVATAR,
  status: 'Active',
  roles: ['Traveler'],
} as const;

/** `data` của `POST /auth/login` và `POST /auth/register`: `AuthResponse` (token là chuỗi giả). */
export const authResponseFixture = {
  accessToken: 'fake-access-token',
  refreshToken: 'fake-refresh-token',
  expiresAt: '2026-10-20T08:00:00+00:00',
  user: userFixture,
} as const;

/** `data` của `POST /auth/refresh-token`: `TokenResponse`, không có `user`. */
export const tokenResponseFixture = {
  accessToken: 'fake-access-token-2',
  refreshToken: 'fake-refresh-token-2',
  expiresAt: '2026-10-20T09:00:00+00:00',
} as const;

/** `data` của `GET /users/me`: `UserProfileResponse`, avatar vẫn là ảnh mặc định chung. */
export const userProfileFixture = {
  ...userFixture,
  createdAt: '2026-10-01T03:00:00+00:00',
} as const;

/** Body JSON route FE `/api/auth/login|register` trả cho browser: chỉ `viewer`, không có token. */
export const viewerJsonFixture = {
  viewer: {
    id: userIdFixture,
    email: 'a@b.vn',
    fullName: 'Nguyễn Văn Ánh',
    handle: 'a',
    avatarUrl: null,
  },
} as const;

const errorEnvelope = (errorCode: string, message: string) =>
  ({ status: 'error', data: null, message, errorCode, timestamp: TIMESTAMP }) as const;

/** `refresh-token` 400: refresh token không có trong DB (`RefreshTokenCommandHandler.cs:49`). */
export const tokenInvalidRefreshEnvelope = errorEnvelope('Token.InvalidRefreshToken', 'RefreshToken không tồn tại.');

/** `refresh-token` 400: token đã thu hồi bị dùng lại, BE thu hồi mọi phiên (`:57`). */
export const tokenCompromisedEnvelope = errorEnvelope(
  'Token.Compromised',
  'Phiên đăng nhập bị xâm phạm, vui lòng đăng nhập lại.',
);

/** `refresh-token` 400: refresh token hết hạn (`:61`). */
export const tokenExpiredEnvelope = errorEnvelope('Token.Expired', 'RefreshToken đã hết hạn, vui lòng đăng nhập lại.');

/** `login` 400, cả khi email sai dạng (`DomainErrors.cs`, `LoginCommandHandler.cs:36-50`). */
export const invalidCredentialsEnvelope = errorEnvelope(
  'Auth.InvalidCredentials',
  'Tài khoản hoặc mật khẩu không chính xác.',
);

/** `change-password` 400: sai mật khẩu hiện tại (`ChangePasswordCommandHandler.cs:42`). */
export const invalidCurrentPasswordEnvelope = errorEnvelope(
  'Auth.InvalidCurrentPassword',
  'Mật khẩu hiện tại không chính xác.',
);

/** `change-password` 400 từ FluentValidation: mật khẩu mới trùng mật khẩu cũ (D-19). */
export const notEqualValidatorEnvelope = errorEnvelope(
  'NotEqualValidator',
  'Mật khẩu mới không được trùng với mật khẩu hiện tại.',
);

/** `register` 409: email đã có người dùng (`RegisterCommandHandler.cs:47`). */
export const emailExistsEnvelope = errorEnvelope(
  'User.EmailAlreadyExists',
  'Email này đã được đăng ký trong hệ thống.',
);
