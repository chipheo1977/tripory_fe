import type { ItineraryId } from '@tripory/shared-kernel';
import type { Comment, CommentId, CommentPage, LikeState } from '../domain';
// `already-removed`: BE trả 404 `Comment.NotFound` khi xóa lại, UI coi như đã xóa (D-12).
export type RemoveCommentOutcome = 'removed' | 'already-removed';
// cổng tới BE của like và bình luận (05.1-BE-CONTRACT.md mục 4).
// `like`/`unlike` gọi lặp an toàn vì PUT/DELETE idempotent ở BE.
// lỗi khác của BE lan ra dưới dạng `ApiError`, repository không nuốt.
export type SocialRepository = Readonly<{
  getLike(id: ItineraryId, signal?: AbortSignal): Promise<LikeState>;
  like(id: ItineraryId): Promise<LikeState>;
  unlike(id: ItineraryId): Promise<LikeState>;
  listComments(
    id: ItineraryId,
    query: Readonly<{ pageIndex: number; pageSize: number }>,
    signal?: AbortSignal,
  ): Promise<CommentPage>;
  addComment(id: ItineraryId, content: string): Promise<Comment>;
  removeComment(id: ItineraryId, commentId: CommentId): Promise<RemoveCommentOutcome>;
}>;
