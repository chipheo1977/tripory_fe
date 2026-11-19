"use client";
// nút "Xem thêm bình luận" và lỗi khi tải trang kế (UI-SPEC §Trạng thái danh sách). lỗi trang kế giữ danh sách đã có.
import { Button } from "@tripory/ui-web";
import { ChevronDown } from "lucide-react";
import { COMMENT_LOAD_MORE_ID, COMMENT_RETRY_NEXT_ID } from "./comment-dom";
import { SOCIAL_COPY } from "./social-copy";

export type CommentLoadMoreProps = Readonly<{ visible: boolean; loading: boolean; onClick(): void }>;

export function CommentLoadMore({ visible, loading, onClick }: CommentLoadMoreProps) {
  return (
    <Button
      className="self-center"
      icon={ChevronDown}
      id={COMMENT_LOAD_MORE_ID}
      loading={loading}
      loadingLabel={SOCIAL_COPY.loadingMore}
      onClick={onClick}
      size="md"
      type="button"
      variant="secondary"
      visible={visible}
    >
      {SOCIAL_COPY.loadMore}
    </Button>
  );
}

export type CommentLoadMoreErrorProps = Readonly<{ visible: boolean; onRetry(): void }>;

export function CommentLoadMoreError({ visible, onRetry }: CommentLoadMoreErrorProps) {
  if (!visible) return null;
  return (
    <div className="flex flex-wrap items-center justify-center gap-inline-sm">
      <p className="text-label font-regular text-danger" role="alert">
        {SOCIAL_COPY.nextErrorText}
      </p>
      <Button
        aria-label={SOCIAL_COPY.nextRetryLabel}
        id={COMMENT_RETRY_NEXT_ID}
        onClick={onRetry}
        size="md"
        type="button"
        variant="secondary"
      >
        {SOCIAL_COPY.retry}
      </Button>
    </div>
  );
}
