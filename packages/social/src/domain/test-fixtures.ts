// dựng dữ liệu mẫu cho test domain. không export qua barrel: chỉ test trong package này dùng.
import { parseUserId } from '@tripory/shared-kernel';
import type { Comment, CommentPage } from './comment';
import { parseCommentId } from './ids';
const userId = (value: string) => {
  const id = parseUserId(value);
  if (id === null) throw new Error('id mẫu phải hợp lệ');
  return id;
};
export const ownerIdFixture = userId('3f2504e0-4f89-11d3-9a0c-0305e82c3301');
export const userIdFixture = userId('7c9e6679-7425-40de-944b-e07fc1f90ae7');
export const otherUserIdFixture = userId('9b2d8f1a-1c3e-4d5f-8a7b-6c5d4e3f2a10');
export const commentIdFixture = (n: number) => {
  const id = parseCommentId(`c0000000-0000-4000-8000-${String(n).padStart(12, '0')}`);
  if (id === null) throw new Error('id mẫu phải hợp lệ');
  return id;
};
export const makeComment = (overrides: Partial<Comment> & { n?: number } = {}): Comment => {
  const { n = 1, ...rest } = overrides;
  return Object.freeze({
    id: commentIdFixture(n),
    content: `Bình luận số ${n}`,
    createdAt: '2026-11-12T08:00:00+00:00',
    author: Object.freeze({ id: userIdFixture, displayName: 'Trần Thị Lan', avatarUrl: null }),
    ...rest,
  });
};
export const makePage = (items: readonly Comment[], overrides: Partial<CommentPage> = {}): CommentPage =>
  Object.freeze({
    items: Object.freeze([...items]),
    pageIndex: 1,
    pageSize: 10,
    totalCount: items.length,
    hasNextPage: false,
    ...overrides,
  });
