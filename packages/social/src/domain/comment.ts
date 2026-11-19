import type { UserId } from '@tripory/shared-kernel';
import type { CommentId } from './ids';
// giới hạn trùng BE (05.1-BE-CONTRACT.md mục 6): 1..500 ký tự sau trim, đếm theo `length` (UTF-16 như .NET).
export const COMMENT_MAX_LENGTH = 500;
// mỗi trang 10 bình luận, mới nhất trước (D-15).
export const COMMENT_PAGE_SIZE = 10;
export type CommentAuthor = Readonly<{ id: UserId; displayName: string; avatarUrl: string | null }>;
// `author` null khi người dùng không còn; `content` là chữ thường, UI không render HTML.
export type Comment = Readonly<{ id: CommentId; content: string; createdAt: string; author: CommentAuthor | null }>;
export type CommentPage = Readonly<{
  items: readonly Comment[];
  pageIndex: number;
  pageSize: number;
  totalCount: number;
  hasNextPage: boolean;
}>;
