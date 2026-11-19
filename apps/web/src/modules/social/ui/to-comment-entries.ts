// ánh xạ bình luận domain sang mục hiển thị kèm quyền xóa (D-12). hàm thuần: quyền tính bằng luật của domain.
import type { UserId } from "@tripory/shared-kernel";
import { canDeleteComment, type Comment } from "@tripory/social";
import type { CommentListEntry } from "./comment-list";
import { SOCIAL_COPY } from "./social-copy";

export function toCommentEntries(
  comments: readonly Comment[],
  viewerId: UserId | null,
  ownerId: UserId,
): readonly CommentListEntry[] {
  return comments.map((comment) => ({
    id: comment.id,
    authorName: comment.author?.displayName ?? SOCIAL_COPY.anonymousAuthor,
    avatarUrl: comment.author?.avatarUrl ?? null,
    createdAt: comment.createdAt,
    content: comment.content,
    canDelete: canDeleteComment(viewerId, comment.author?.id ?? null, ownerId),
  }));
}
