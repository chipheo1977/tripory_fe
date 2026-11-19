"use client";
// controller của khối bình luận cuối bài: dữ liệu, quyền xóa, gửi, xóa, tải thêm và focus (D-09..D-18, D-26).
// component `CommentSection` chỉ trình bày phần trả về. kết quả nhóm theo mối quan tâm (`view`, `composer`, `list`,
// `dialog`) để mỗi mảnh chỉ lấy phần cần. lỗi do hook này quyết: lỗi validate gắn ô, lỗi khác toast tiếng Việt.
// không setState trong effect: effect chỉ gọi focus DOM qua `useCommentsFocus`.
import { isApiError } from "@tripory/api-client";
import { notify } from "@tripory/ui-web";
import { useEffect, useMemo, useRef, useState } from "react";
import { social } from "@/composition/social.client";
import { decideMutationError, ERROR_MESSAGES } from "@/lib/feedback";
import type { ComposerOutcome } from "./comment-composer";
import { COMMENT_RETRY_NEXT_ID, COMMENTS_HEADING_ID, COMMENTS_SECTION_ID, commentDomId } from "./comment-dom";
import type { CommentListEntry } from "./comment-list";
import { useSocialComments } from "./social-context";
import { SOCIAL_COPY } from "./social-copy";
import { commentHeading } from "./social-format";
import { toCommentEntries } from "./to-comment-entries";
import { useCommentsFocus } from "./use-comments-focus";

// lỗi do hook tự xử lý (gắn ô hoặc toast có câu riêng), nên tắt toast chung của MutationCache.
const FORM_META = { feedback: { errorToast: false } } as const;

const REASON_MESSAGE = {
  empty: SOCIAL_COPY.composerRequired,
  "too-long": SOCIAL_COPY.composerTooLong,
} as const;

const FIELD_ERROR_CODES: ReadonlySet<string> = new Set(["Comment.ContentRequired", "Comment.ContentTooLong"]);

/** mã lỗi validate của BE thì trả câu để gắn dưới ô, ngược lại `null`. */
function fieldErrorMessage(error: unknown): string | null {
  if (!isApiError(error) || error.code === null) return null;
  if (!FIELD_ERROR_CODES.has(error.code)) return null;
  return ERROR_MESSAGES.get(error.code) ?? null;
}

function toastError(error: unknown, fallbackMessage: string): void {
  const decision = decideMutationError(error, { fallbackMessage });
  if (decision !== null) notify[decision.variant](decision.message);
}

/** sau khi xóa: focus bình luận ngay sau, không có thì ngay trước, không còn thì `null` (về tiêu đề). */
function nextFocusId(entries: readonly CommentListEntry[], removedId: string): string | null {
  const index = entries.findIndex((entry) => entry.id === removedId);
  const neighbour = entries[index + 1] ?? entries[index - 1];
  return neighbour?.id ?? null;
}

type FocusRequest = Readonly<{ token: number; id: string | null }>;

export function useCommentSection() {
  const { itineraryId, ownerId, viewerId, mode, count, adjustCount, focusToken } = useSocialComments();
  const feed = social.useCommentFeed(itineraryId);
  const add = social.useAddComment(itineraryId, FORM_META);
  const remove = social.useRemoveComment(itineraryId, FORM_META);
  const focus = useCommentsFocus({ token: focusToken, sectionId: COMMENTS_SECTION_ID, headingId: COMMENTS_HEADING_ID });
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const [focusRequest, setFocusRequest] = useState<FocusRequest | null>(null);
  const deletingRef = useRef(false);
  // chỉ ghi trong handler: vị trí bắt đầu của trang đang tải thêm, để focus phần tử đầu tiên vừa nối.
  const loadMoreRef = useRef<number | null>(null);

  const entries = useMemo(() => toCommentEntries(feed.comments, viewerId, ownerId), [feed.comments, viewerId, ownerId]);

  const { focusById, focusHeading } = focus;
  useEffect(() => {
    if (focusRequest === null) return;
    if (focusRequest.id === null) focusHeading();
    else focusById(commentDomId(focusRequest.id));
  }, [focusRequest, focusById, focusHeading]);

  const { comments: loaded, fetchingNext, nextFailed } = feed;
  useEffect(() => {
    const from = loadMoreRef.current;
    if (from === null || fetchingNext) return;
    loadMoreRef.current = null;
    if (nextFailed) {
      focusById(COMMENT_RETRY_NEXT_ID);
      return;
    }
    const first = loaded[from];
    if (first !== undefined) focusById(commentDomId(first.id));
  }, [loaded, fetchingNext, nextFailed, focusById]);

  async function submit(raw: string): Promise<ComposerOutcome> {
    try {
      const result = await add.submit(raw);
      if (!result.ok) return { kind: "field-error", message: REASON_MESSAGE[result.reason] };
      adjustCount(1);
      return { kind: "sent" };
    } catch (error) {
      const message = fieldErrorMessage(error);
      if (message !== null) return { kind: "field-error", message };
      toastError(error, SOCIAL_COPY.submitErrorFallback);
      return { kind: "failed" };
    }
  }

  async function confirmDelete(): Promise<void> {
    const target = loaded.find((comment) => comment.id === deleteTargetId);
    if (target === undefined || deletingRef.current) return;
    deletingRef.current = true;
    const focusAfter = nextFocusId(entries, target.id);
    try {
      await remove.remove(target.id);
      adjustCount(-1);
      setAnnouncement(SOCIAL_COPY.deletedSr);
      setFocusRequest((previous) => ({ token: (previous?.token ?? 0) + 1, id: focusAfter }));
    } catch (error) {
      toastError(error, SOCIAL_COPY.deleteErrorFallback);
    } finally {
      deletingRef.current = false;
      setDeleteTargetId(null);
    }
  }

  const startLoadMore = () => {
    loadMoreRef.current = loaded.length;
    feed.fetchNext();
  };

  const ready = feed.status === "ready";
  const hasItems = entries.length > 0;
  const showList = ready && hasItems;
  const canLoadMore = feed.hasNextPage && !nextFailed;

  return {
    view: {
      heading: commentHeading(count),
      mode,
      now: feed.loadedAt,
      announcement,
      showSkeleton: feed.status === "loading",
      showLoadError: feed.status === "error",
      showEmpty: ready && !hasItems,
      showList,
      showLoadMore: showList && canLoadMore,
      showLoadMoreError: showList && nextFailed,
    },
    composer: { submit },
    list: {
      entries,
      loadingMore: fetchingNext,
      requestDelete: (id: string) => setDeleteTargetId(id),
      loadMore: startLoadMore,
      retryFirstPage: () => {
        feed.retry();
        focusHeading();
      },
      retryNext: startLoadMore,
    },
    dialog: {
      open: deleteTargetId !== null,
      pending: remove.pending,
      onOpenChange: (open: boolean) => {
        if (open || deletingRef.current) return;
        setDeleteTargetId(null);
      },
      confirm: () => {
        void confirmDelete();
      },
    },
  };
}
