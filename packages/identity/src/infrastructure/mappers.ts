import { parseUserId } from '@tripory/shared-kernel';
import type { Viewer } from '../domain';

/**
 * Avatar mặc định của BE (`User.cs:11,19,54`): seed cố định nên mọi người chưa đổi ảnh có cùng một URL.
 * Đó không phải ảnh của người dùng, nên ACL coi như không có ảnh và UI hiện chữ cái đầu (D-12).
 */
export const DEFAULT_AVATAR_URL = 'https://api.dicebear.com/7.x/identicon/svg?seed=tripory';

/** `null` cho thiếu, rỗng, toàn khoảng trắng và avatar mặc định chung; URL khác giữ nguyên (đã trim). */
export const normalizeAvatarUrl = (url: string | null | undefined): string | null => {
  const trimmed = url?.trim() ?? '';

  return trimmed === '' || trimmed === DEFAULT_AVATAR_URL ? null : trimmed;
};

/** Phần chung của `userDto`, `userProfileDto` và `viewerDto` mà `Viewer` cần. */
export type ViewerSource = Readonly<{
  id: string;
  email: string;
  fullName: string;
  handle: string;
  avatarUrl?: string | null | undefined;
}>;

/**
 * Dựng `Viewer` từ DTO. Chỉ chép đúng 5 trường nên token hay trường thừa không đi tiếp (T-03-12).
 * Id sai dạng thì ném lỗi thay vì trả một `Viewer` hỏng (T-03-10).
 */
export const toViewer = (source: ViewerSource): Viewer => {
  const id = parseUserId(source.id);

  if (id === null) throw new Error('Id người dùng trong phản hồi của BE không hợp lệ.');

  return {
    id,
    email: source.email,
    fullName: source.fullName,
    handle: source.handle,
    avatarUrl: normalizeAvatarUrl(source.avatarUrl),
  };
};
