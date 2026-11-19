// Dữ liệu domain social dùng chung cho test UI của Phase 5.1. Test dưới `modules/**` không được import
// `@tripory/social/http` nên dựng thẳng object domain (mẫu `domain-itinerary-fixtures.ts`). Không import `vitest`.
import { parseCommentId } from "@tripory/social";
import type { Comment, CommentAuthor, CommentPage, LikeState } from "@tripory/social";
import { fxOtherId } from "./domain-itinerary-fixtures";
function required<T>(value: T | null, name: string): T {
  if (value === null) throw new Error(`Dữ liệu mẫu ${name} phải hợp lệ.`);
  return value;
}
export const fxCommentId = (n: number) =>
  required(parseCommentId(`c0000000-0000-4000-8000-${String(n).padStart(12, "0")}`), "commentId");
/** Tác giả mẫu là người khác (`FX_OTHER_ID`), để test quyền xóa của chủ và người thứ ba. */
export const FX_COMMENT_AUTHOR: CommentAuthor = { id: fxOtherId(), displayName: "Trần Thị Lan", avatarUrl: null };
/** Comment thứ n, `createdAt` giảm dần theo n. */
export function makeFxComment(n: number, overrides: Partial<Comment> = {}): Comment {
  const minutes = String(Math.max(0, 59 - n)).padStart(2, "0");
  return {
    id: fxCommentId(n),
    content: `Bình luận số ${n}`,
    createdAt: `2026-11-12T08:${minutes}:00+00:00`,
    author: FX_COMMENT_AUTHOR,
    ...overrides,
  };
}
export function makeFxCommentPage(items: readonly Comment[], overrides: Partial<CommentPage> = {}): CommentPage {
  return {
    items,
    pageIndex: 1,
    pageSize: 10,
    totalCount: items.length,
    hasNextPage: false,
    ...overrides,
  };
}
export const FX_LIKE_STATE: LikeState = { count: 12, liked: false };
