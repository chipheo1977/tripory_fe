import { z } from 'zod';

// ACL: hình dạng JSON của BE (tripory_be, 03-RESEARCH.md §Contract BE) và của route FE `/api/auth/*`.
// Mọi thứ vào từ mạng đều qua `.parse` ở đây, nên tên field BE không rò sang domain hay UI.
// Zod mặc định bỏ khóa lạ: token hay trường thừa ở phản hồi không lọt qua schema `viewerDto` (T-03-12).

/** `UserDto` trong `AuthResponse`. `bio` và `avatarUrl` nhận cả `null` để không vỡ khi BE đổi sang nullable. */
export const userDto = z.object({
  id: z.string(),
  email: z.string(),
  handle: z.string(),
  fullName: z.string(),
  bio: z.string().nullish(),
  avatarUrl: z.string().nullish(),
  status: z.string(),
  roles: z.array(z.string()),
});

/** `data` của `POST /auth/login` và `POST /auth/register`. */
export const authResponseDto = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  expiresAt: z.string(),
  user: userDto,
});

/** `data` của `POST /auth/refresh-token`: không có `user`. */
export const tokenResponseDto = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  expiresAt: z.string(),
});

/** `data` của `GET /users/me`. */
export const userProfileDto = userDto.extend({ createdAt: z.string() });

/** Hình route FE trả cho browser: đủ để hiện menu, không có token. */
export const viewerDto = z.object({
  id: z.string(),
  email: z.string(),
  fullName: z.string(),
  handle: z.string(),
  avatarUrl: z.string().nullish(),
});

/** Body `data` của `POST /api/auth/login|register`. */
export const viewerResponseDto = z.object({ viewer: viewerDto });
