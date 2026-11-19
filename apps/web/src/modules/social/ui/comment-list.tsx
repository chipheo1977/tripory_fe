"use client";
// danh sách bình luận phẳng, mới nhất trước theo thứ tự đã cho (D-09, D-15).
import { CommentItem } from "./comment-item";
import { commentDomId } from "./comment-dom";
import { SOCIAL_COPY } from "./social-copy";

export type CommentListEntry = Readonly<{
  id: string;
  authorName: string;
  avatarUrl: string | null;
  createdAt: string;
  content: string;
  canDelete: boolean;
}>;

export type CommentListProps = Readonly<{
  visible: boolean;
  entries: readonly CommentListEntry[];
  now: number | null;
  onDelete(id: string): void;
}>;

export function CommentList({ visible, entries, now, onDelete }: CommentListProps) {
  if (!visible) return null;
  return (
    <ol aria-label={SOCIAL_COPY.listLabel} className="flex flex-col gap-stack-lg">
      {entries.map((entry) => (
        <li key={entry.id}>
          <CommentItem
            authorName={entry.authorName}
            avatarUrl={entry.avatarUrl}
            canDelete={entry.canDelete}
            content={entry.content}
            createdAt={entry.createdAt}
            domId={commentDomId(entry.id)}
            now={now}
            onDelete={() => onDelete(entry.id)}
          />
        </li>
      ))}
    </ol>
  );
}
