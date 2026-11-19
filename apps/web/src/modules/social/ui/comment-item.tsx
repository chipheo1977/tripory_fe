"use client";
// một bình luận phẳng (D-09, UI-SPEC §Mỗi comment): avatar, tên chữ thường, thời gian, nội dung, nút xóa theo quyền.
// nội dung là text node của React: HTML hiện nguyên văn, URL không thành link (D-10). không sửa, không trả lời (D-11).
// props hẹp: không nhận cả `Comment`, không có email, handle hay id người dùng.
import { Avatar, Icon, IconButton } from "@tripory/ui-web";
import { Trash2 } from "lucide-react";
import { deleteLabel } from "./social-copy";
import { formatAbsoluteDateTime, formatCommentTime } from "./social-format";

export type CommentItemProps = Readonly<{
  domId: string;
  authorName: string;
  avatarUrl: string | null;
  createdAt: string;
  now: number | null;
  content: string;
  canDelete: boolean;
  onDelete(): void;
}>;

function DeleteCommentButton({ visible, label, onClick }: Readonly<{ visible: boolean; label: string; onClick(): void }>) {
  if (!visible) return null;
  return (
    <IconButton aria-label={label} onClick={onClick} size="md" type="button" variant="ghost">
      <Icon className="text-muted" icon={Trash2} size="sm" />
    </IconButton>
  );
}

export function CommentItem({
  domId,
  authorName,
  avatarUrl,
  createdAt,
  now,
  content,
  canDelete,
  onDelete,
}: CommentItemProps) {
  const nameId = `${domId}-ten`;
  return (
    <article
      aria-labelledby={nameId}
      className="grid grid-cols-[auto_1fr] gap-inline-sm outline-hidden focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
      id={domId}
      tabIndex={-1}
    >
      <span aria-hidden="true">
        <Avatar name={authorName} size="sm" src={avatarUrl ?? undefined} />
      </span>
      <div className="flex min-w-0 flex-col gap-inline-xs">
        <div className="flex items-start justify-between gap-inline-sm">
          <div className="flex min-w-0 flex-wrap items-baseline gap-x-inline-sm">
            <span className="break-words text-label font-semibold text-text" id={nameId}>
              {authorName}
            </span>
            <time
              className="text-label font-regular tabular-nums text-muted"
              dateTime={createdAt}
              title={formatAbsoluteDateTime(createdAt)}
            >
              {formatCommentTime(createdAt, now)}
            </time>
          </div>
          <DeleteCommentButton label={deleteLabel(authorName)} onClick={onDelete} visible={canDelete} />
        </div>
        <p className="break-words whitespace-pre-line text-body text-text">{content}</p>
      </div>
    </article>
  );
}
