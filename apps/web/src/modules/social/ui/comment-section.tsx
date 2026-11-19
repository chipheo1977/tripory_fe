"use client";
// khối bình luận cuối bài viết (D-09..D-18, D-20, UI-SPEC §Khối comment cuối bài). chỉ trình bày phần
// `useCommentSection` trả về; mỗi trạng thái là một component có `visible`. thứ tự DOM là thứ tự Tab.
// lỗi tải bình luận chỉ ở trong khối, không làm hỏng phần còn lại của trang (D-17). `CommentsEmpty` của khách
// không lặp nút đăng nhập vì khung mời đã ở trên. hook tải bình luận chỉ chạy khi khối hiển thị (D-01).
import { CommentComposer } from "./comment-composer";
import { CommentGuestPrompt } from "./comment-guest-prompt";
import { CommentList } from "./comment-list";
import { CommentListSkeleton, CommentsEmpty, CommentsLoadError } from "./comment-list-states";
import { CommentLoadMore, CommentLoadMoreError } from "./comment-load-more";
import { CommentSectionFrame } from "./comment-section-frame";
import { DeleteCommentDialog } from "./delete-comment-dialog";
import { useCommentSection } from "./use-comment-section";

export type CommentSectionProps = Readonly<{ visible: boolean }>;

function CommentSectionBody() {
  const { view, composer, list, dialog } = useCommentSection();
  return (
    <CommentSectionFrame announcement={view.announcement} heading={view.heading} visible>
      <CommentComposer onSubmit={composer.submit} visible={view.mode === "member"} />
      <CommentGuestPrompt visible={view.mode === "guest"} />
      <CommentListSkeleton visible={view.showSkeleton} />
      <CommentsLoadError onRetry={list.retryFirstPage} visible={view.showLoadError} />
      <CommentsEmpty mode={view.mode} visible={view.showEmpty} />
      <CommentList entries={list.entries} now={view.now} onDelete={list.requestDelete} visible={view.showList} />
      <CommentLoadMore loading={list.loadingMore} onClick={list.loadMore} visible={view.showLoadMore} />
      <CommentLoadMoreError onRetry={list.retryNext} visible={view.showLoadMoreError} />
      <DeleteCommentDialog
        onConfirm={dialog.confirm}
        onOpenChange={dialog.onOpenChange}
        open={dialog.open}
        pending={dialog.pending}
      />
    </CommentSectionFrame>
  );
}

export function CommentSection({ visible }: CommentSectionProps) {
  if (!visible) return null;
  return <CommentSectionBody />;
}
