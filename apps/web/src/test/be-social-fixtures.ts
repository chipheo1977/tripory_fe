// Fixture JSON like/comment của BE dùng chung cho test app (plan 05.1-03, dùng ở các plan hook/UI sau).
// Nguồn: 05.1-BE-CONTRACT.md mục 4-5. Dữ liệu mẫu: GUID bịa, không token/email thật. Không import `vitest`.
import { OTHER_USER_ID } from "./be-itinerary-fixtures";
export type LikeStateJson = { likeCount: number; likedByMe: boolean };
export type CommentAuthorJson = { id: string; displayName: string; avatarUrl: string | null };
export type CommentJson = {
  id: string;
  content: string;
  createdAt: string;
  author?: CommentAuthorJson | null;
};
export type CommentPageJson = {
  items: CommentJson[];
  pageIndex: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
};
const commentId = (n: number) => `c0000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
export const COMMENT_ID_1 = commentId(1);
export const COMMENT_ID_2 = commentId(2);
export const COMMENT_ID_3 = commentId(3);
export const COMMENT_ID_4 = commentId(4);
export const COMMENT_ID_5 = commentId(5);
export const COMMENT_ID_6 = commentId(6);
export const COMMENT_ID_7 = commentId(7);
export const COMMENT_ID_8 = commentId(8);
export const COMMENT_ID_9 = commentId(9);
export const COMMENT_ID_10 = commentId(10);
export const COMMENT_ID_11 = commentId(11);
export const COMMENT_ID_12 = commentId(12);
/** Tác giả mẫu của comment: người khác (không phải chủ lịch trình), không email. */
export const COMMENT_AUTHOR_JSON: CommentAuthorJson = { id: OTHER_USER_ID, displayName: "Trần Thị Lan", avatarUrl: null };
export function likeStateJson(overrides: Partial<LikeStateJson> = {}): LikeStateJson {
  return { likeCount: 12, likedByMe: false, ...overrides };
}
/** Comment thứ n: id theo n, `createdAt` giảm dần theo n (n càng lớn càng cũ). */
export function commentJson(n: number, overrides: Partial<CommentJson> = {}): CommentJson {
  const minutes = String(Math.max(0, 59 - n)).padStart(2, "0");
  return {
    id: commentId(n),
    content: `Bình luận số ${n}`,
    createdAt: `2026-11-12T08:${minutes}:00.1234567+00:00`,
    author: COMMENT_AUTHOR_JSON,
    ...overrides,
  };
}
/** Một trang `PagedResult<CommentDto>`; `totalCount` mặc định suy từ số item và `hasNextPage`. */
export function commentPageJson(items: CommentJson[], overrides: Partial<CommentPageJson> = {}): CommentPageJson {
  const pageIndex = overrides.pageIndex ?? 1;
  const pageSize = overrides.pageSize ?? 10;
  const hasNextPage = overrides.hasNextPage ?? false;
  const totalCount = overrides.totalCount ?? (pageIndex - 1) * pageSize + items.length + (hasNextPage ? 1 : 0);
  return {
    items,
    pageIndex,
    pageSize,
    totalCount,
    totalPages: Math.ceil(totalCount / pageSize),
    hasNextPage,
    hasPreviousPage: pageIndex > 1,
    ...overrides,
  };
}
export const socialEnvelope = <T>(data: T) => ({
  status: "success" as const,
  data,
  message: null,
  errorCode: null,
  timestamp: "2026-11-12T08:00:00+00:00",
});
