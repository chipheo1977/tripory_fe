"use client";
// trạng thái của danh sách bình luận (UI-SPEC §Trạng thái danh sách). mỗi trạng thái là một component có `visible`.
// không dùng component trạng thái rỗng/lỗi dựng sẵn của ui-web: chúng có `h2` riêng, sẽ lồng dưới `h2` "Bình luận (N)".
import { Button, Icon, InlineAlert, Skeleton } from "@tripory/ui-web";
import { MessageCircle } from "lucide-react";
import { SOCIAL_COPY } from "./social-copy";

const SKELETON_ROWS = [0, 1, 2] as const;

export function CommentListSkeleton({ visible }: Readonly<{ visible: boolean }>) {
  if (!visible) return null;
  return (
    <div className="flex flex-col gap-stack-lg">
      {SKELETON_ROWS.map((row) => (
        <div className="grid grid-cols-[auto_1fr] gap-inline-sm" key={row}>
          <Skeleton className="size-control-sm" variant="circle" />
          <div className="flex flex-col gap-inline-xs">
            <Skeleton className="w-1/3" variant="text" />
            <Skeleton variant="text" />
            <Skeleton className="w-2/3" variant="text" />
          </div>
        </div>
      ))}
      <p className="sr-only" role="status">
        {SOCIAL_COPY.loadingSr}
      </p>
    </div>
  );
}

const EMPTY_BODY = { member: SOCIAL_COPY.emptyMember, guest: SOCIAL_COPY.emptyGuest } as const;

export type CommentsEmptyProps = Readonly<{ visible: boolean; mode: "member" | "guest" }>;

/** khách chỉ thấy câu mời, nút đăng nhập nằm ở khung mời phía trên (không lặp lại ở đây). */
export function CommentsEmpty({ visible, mode }: CommentsEmptyProps) {
  if (!visible) return null;
  return (
    <div className="flex flex-col items-center gap-stack-sm py-stack-lg text-center">
      <Icon className="text-subtle" icon={MessageCircle} size="lg" />
      <p className="text-body font-semibold text-text">{SOCIAL_COPY.emptyHeading}</p>
      <p className="text-body text-muted">{EMPTY_BODY[mode]}</p>
    </div>
  );
}

export type CommentsLoadErrorProps = Readonly<{ visible: boolean; onRetry(): void }>;

/** lệch D-17 có chủ đích (UI-SPEC FLAG 2): `InlineAlert` thay component lỗi dựng sẵn vì nó có `h2` và copy cố định. */
export function CommentsLoadError({ visible, onRetry }: CommentsLoadErrorProps) {
  if (!visible) return null;
  return (
    <InlineAlert
      action={
        <Button aria-label={SOCIAL_COPY.retryLabel} onClick={onRetry} size="md" type="button" variant="secondary">
          {SOCIAL_COPY.retry}
        </Button>
      }
      variant="danger"
    >
      <span className="flex flex-col gap-inline-xs">
        <span className="font-semibold">{SOCIAL_COPY.loadErrorTitle}</span>
        <span>{SOCIAL_COPY.loadErrorHint}</span>
      </span>
    </InlineAlert>
  );
}
