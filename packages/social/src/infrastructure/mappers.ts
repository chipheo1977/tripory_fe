import { parseUserId } from '@tripory/shared-kernel';
import { parseCommentId } from '../domain';
import type { Comment, CommentAuthor, CommentPage, LikeState } from '../domain';
import type { CommentAuthorDto, CommentDto, CommentPageDto, LikeStateDto } from './dto';
// ACL: DTO của BE thành type domain. chỉ chép đúng trường domain cần; id bình luận hỏng thì ném thay vì trả
// bình luận hỏng (T-51-23). mọi kết quả đã freeze để cache React Query không bị sửa tại chỗ.

// package context không import nhau nên khai báo lại; trùng với `itinerary`, `identity`, ứng viên lên kernel sau.
const DEFAULT_AUTHOR_AVATAR_URL = 'https://api.dicebear.com/7.x/identicon/svg?seed=tripory';

const blankToNull = (value: string | null | undefined): string | null => {
  const trimmed = value?.trim() ?? '';
  return trimmed === '' ? null : trimmed;
};

const toAvatar = (value: string | null | undefined): string | null => {
  const url = blankToNull(value);
  if (url === null || url === DEFAULT_AUTHOR_AVATAR_URL) return null;
  return url;
};

export const toLikeState = (dto: LikeStateDto): LikeState =>
  Object.freeze({ count: dto.likeCount, liked: dto.likedByMe });

/** tác giả thiếu hoặc hỏng (id sai, tên rỗng) thành `null`: UI hiện "Người dùng Tripory", không vỡ danh sách. */
export function toCommentAuthor(dto: CommentAuthorDto | null | undefined): CommentAuthor | null {
  if (dto === null || dto === undefined) return null;
  const id = parseUserId(dto.id);
  const displayName = blankToNull(dto.displayName);
  if (id === null || displayName === null) return null;
  return Object.freeze({ id, displayName, avatarUrl: toAvatar(dto.avatarUrl) });
}

/** `content` giữ nguyên văn (xuống dòng, HTML, URL): UI render chữ thường. */
export function toComment(dto: CommentDto): Comment {
  const id = parseCommentId(dto.id);
  if (id === null) throw new Error('Id bình luận trong phản hồi của BE không hợp lệ.');
  return Object.freeze({
    id,
    content: dto.content,
    createdAt: dto.createdAt,
    author: toCommentAuthor(dto.author),
  });
}

export const toCommentPage = (dto: CommentPageDto): CommentPage =>
  Object.freeze({
    items: Object.freeze(dto.items.map(toComment)),
    pageIndex: dto.pageIndex,
    pageSize: dto.pageSize,
    totalCount: dto.totalCount,
    hasNextPage: dto.hasNextPage,
  });
