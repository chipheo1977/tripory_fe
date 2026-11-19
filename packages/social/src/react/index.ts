import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { DefaultError, InfiniteData, MutationMeta, QueryClient } from '@tanstack/react-query';
import type { ItineraryId } from '@tripory/shared-kernel';
import { useCallback, useMemo, useRef, useState } from 'react';
import { makeSubmitComment } from '../application';
import type { RemoveCommentOutcome, SocialRepository, SubmitCommentResult } from '../application';
import {
  COMMENT_PAGE_SIZE,
  mergeCommentPages,
  nextCommentPageIndex,
  prependCommentToPages,
  removeCommentFromPages,
  toggleLike,
} from '../domain';
import type { Comment, CommentId, CommentPage, LikeState } from '../domain';
import { socialKeys } from './keys';
// hook factory: composition của app lắp `SocialRepository` một lần rồi nhận bốn hook ra, nên package không biết
// gì về HTTP hay điều hướng. bốn hook tách riêng (một hook một việc): like, đọc bình luận, gửi, xóa.
// callback đặt ở cấp hook, không ở `mutate(vars, {...})`, vì callback cấp mutate bị bỏ khi component unmount.
// `meta` do app truyền (cấu hình toast), hook không tự toast.
export { socialKeys } from './keys';

export type CommentFeedStatus = 'loading' | 'error' | 'ready';

export type LikeStateInput = Readonly<{
  itineraryId: ItineraryId;
  initial: LikeState;
  sync: boolean;
  meta?: MutationMeta;
}>;

type CommentPages = InfiniteData<CommentPage, number>;

const EMPTY_COMMENTS: readonly Comment[] = Object.freeze([]);

const feedStatus = (hasData: boolean, isError: boolean): CommentFeedStatus => {
  if (hasData) return 'ready';
  if (isError) return 'error';
  return 'loading';
};

// ghi thẳng vào cache bình luận; cache chưa có dữ liệu thì cho tải lại thay vì dựng trang giả.
function updateCommentPages(
  qc: QueryClient,
  id: ItineraryId,
  update: (pages: readonly CommentPage[]) => readonly CommentPage[],
): void {
  const key = socialKeys.comments(id);
  const current = qc.getQueryData<CommentPages>(key);
  if (current === undefined) {
    void qc.invalidateQueries({ queryKey: key });
    return;
  }
  qc.setQueryData<CommentPages>(key, { ...current, pages: [...update(current.pages)] });
}

export function createSocialHooks(deps: Readonly<{ repository: SocialRepository }>) {
  const { repository } = deps;
  const submitComment = makeSubmitComment(repository);

  return {
    /**
     * tim lạc quan ±1 (D-07): đổi ngay khi bấm, các lệnh gửi nối đuôi trong cùng `scope`, phản hồi cũ không đè
     * trạng thái mới; hết lệnh chờ thì hiện giá trị BE xác nhận gần nhất (lệnh cuối lỗi thì quay về đó).
     * `sync` (D-27): SSR không kèm Bearer nên `likedByMe` có thể sai, đọc lại một lần qua BFF và khóa nút tới khi xong.
     */
    useLikeState: (input: LikeStateInput) => {
      const { itineraryId: id, initial, sync, meta } = input;
      const query = useQuery({
        queryKey: socialKeys.like(id),
        queryFn: ({ signal }) => repository.getLike(id, signal),
        enabled: sync,
        staleTime: Infinity,
        refetchOnWindowFocus: false,
      });
      const syncing = sync && query.isPending;
      const base = query.data ?? initial;
      const [local, setLocal] = useState<LikeState | null>(null);
      const state = local ?? base;
      // chỉ đọc/ghi trong handler và callback của mutation, không lúc render.
      const displayRef = useRef<LikeState | null>(null);
      const confirmedRef = useRef<LikeState>(initial);
      const pendingRef = useRef(0);
      const mutation = useMutation<LikeState, DefaultError, boolean>({
        mutationKey: socialKeys.likeWrite(id),
        scope: { id: `social:like:${id}` },
        meta,
        mutationFn: (liked) => (liked ? repository.like(id) : repository.unlike(id)),
        onSuccess: (data) => {
          confirmedRef.current = data;
        },
        onSettled: () => {
          pendingRef.current -= 1;
          if (pendingRef.current > 0) return;
          displayRef.current = confirmedRef.current;
          setLocal(confirmedRef.current);
        },
      });
      const { mutate } = mutation;
      const toggle = useCallback(() => {
        if (syncing) return;
        if (displayRef.current === null) confirmedRef.current = base;
        const next = toggleLike(displayRef.current ?? base);
        displayRef.current = next;
        setLocal(next);
        pendingRef.current += 1;
        mutate(next.liked);
      }, [syncing, base, mutate]);
      return { state, syncing, toggle };
    },

    /**
     * bình luận mới nhất trước, 10 mỗi trang (D-15). trang kế tính theo số phần tử đã tải sau khi bỏ trùng
     * (RESEARCH R4): chèn hay xóa làm phần tử dịch vị trí, `pageIndex + 1` sẽ sót hoặc lặp.
     * không refetch khi focus lại để danh sách không nhảy dưới tay người đọc.
     */
    useCommentFeed: (itineraryId: ItineraryId) => {
      const query = useInfiniteQuery<
        CommentPage,
        DefaultError,
        CommentPages,
        ReturnType<typeof socialKeys.comments>,
        number
      >({
        queryKey: socialKeys.comments(itineraryId),
        queryFn: ({ pageParam, signal }) =>
          repository.listComments(itineraryId, { pageIndex: pageParam, pageSize: COMMENT_PAGE_SIZE }, signal),
        initialPageParam: 1,
        getNextPageParam: (last, all) =>
          last.hasNextPage ? nextCommentPageIndex(mergeCommentPages(all).length, last.pageSize) : undefined,
        staleTime: Infinity,
        refetchOnWindowFocus: false,
      });
      const pages = query.data?.pages;
      const comments = useMemo(() => (pages === undefined ? EMPTY_COMMENTS : mergeCommentPages(pages)), [pages]);
      const { fetchNextPage, refetch } = query;
      const fetchNext = useCallback(() => {
        void fetchNextPage();
      }, [fetchNextPage]);
      const retry = useCallback(() => {
        void refetch();
      }, [refetch]);
      return {
        status: feedStatus(query.data !== undefined, query.isError),
        comments,
        hasNextPage: query.hasNextPage,
        fetchingNext: query.isFetchingNextPage,
        nextFailed: query.isFetchNextPageError,
        loadedAt: query.dataUpdatedAt === 0 ? null : query.dataUpdatedAt,
        fetchNext,
        retry,
      };
    },

    /** gửi bình luận: luật nội dung kiểm trước mạng; thành công thì chèn bản BE trả về lên đầu, không refetch. */
    useAddComment: (itineraryId: ItineraryId, meta?: MutationMeta) => {
      const qc = useQueryClient();
      const mutation = useMutation<SubmitCommentResult, DefaultError, string>({
        mutationKey: socialKeys.commentWrite(itineraryId),
        scope: { id: `social:comment:${itineraryId}` },
        meta,
        mutationFn: (raw) => submitComment(itineraryId, raw),
        onSuccess: (result) => {
          if (!result.ok) return;
          updateCommentPages(qc, itineraryId, (pages) => prependCommentToPages(pages, result.comment));
        },
      });
      return { submit: mutation.mutateAsync, pending: mutation.isPending };
    },

    /** xóa bình luận: `removed` lẫn `already-removed` (D-12) đều gỡ khỏi cache. */
    useRemoveComment: (itineraryId: ItineraryId, meta?: MutationMeta) => {
      const qc = useQueryClient();
      const mutation = useMutation<RemoveCommentOutcome, DefaultError, CommentId>({
        mutationKey: socialKeys.commentWrite(itineraryId),
        scope: { id: `social:comment:${itineraryId}` },
        meta,
        mutationFn: (commentId) => repository.removeComment(itineraryId, commentId),
        onSuccess: (_outcome, commentId) => {
          updateCommentPages(qc, itineraryId, (pages) => removeCommentFromPages(pages, commentId));
        },
      });
      return { remove: mutation.mutateAsync, pending: mutation.isPending };
    },
  };
}

export type SocialHooks = ReturnType<typeof createSocialHooks>;
