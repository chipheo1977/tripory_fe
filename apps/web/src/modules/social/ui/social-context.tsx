"use client";
// một nguồn trạng thái like và bình luận cho cả chế độ Bài viết lẫn Bản đồ (D-03): hero, tab Tổng quan và khối
// bình luận cùng đọc ở đây, không component nào tự giữ số like hay số bình luận.
// tách hai context để đổi số like không làm khối bình luận render lại và ngược lại (Interface Segregation).
// provider đứng ngoài `PublicItineraryView` (RESEARCH R1), qua `wrap` của factory social.
import type { ItineraryId, UserId } from "@tripory/shared-kernel";
import type { LikeState } from "@tripory/social";
import { createContext, use, useCallback, useMemo, useState, type ReactNode } from "react";
import { social } from "@/composition/social.client";
import { SOCIAL_COPY } from "./social-copy";

export type SocialMode = "member" | "guest";

export type SocialLikeValue = Readonly<{ state: LikeState; syncing: boolean; toggle(): void; mode: SocialMode }>;

export type SocialCommentsValue = Readonly<{
  itineraryId: ItineraryId;
  ownerId: UserId;
  viewerId: UserId | null;
  mode: SocialMode;
  count: number;
  adjustCount(delta: number): void;
  focusToken: number;
  requestFocus(): void;
}>;

export type SocialProviderProps = Readonly<{
  itineraryId: ItineraryId;
  ownerId: UserId;
  viewerId: UserId | null;
  initialLike: LikeState;
  initialCommentCount: number;
  syncLike: boolean;
  children: ReactNode;
}>;

const LIKE_MUTATION_META = { feedback: { fallbackMessage: SOCIAL_COPY.likeErrorFallback } } as const;

const LikeContext = createContext<SocialLikeValue | null>(null);
const CommentsContext = createContext<SocialCommentsValue | null>(null);

export function SocialProvider({
  itineraryId,
  ownerId,
  viewerId,
  initialLike,
  initialCommentCount,
  syncLike,
  children,
}: SocialProviderProps) {
  const like = social.useLikeState({ itineraryId, initial: initialLike, sync: syncLike, meta: LIKE_MUTATION_META });
  const [count, setCount] = useState(initialCommentCount);
  const [focusToken, setFocusToken] = useState(0);
  const adjustCount = useCallback((delta: number) => setCount((current) => Math.max(0, current + delta)), []);
  const requestFocus = useCallback(() => setFocusToken((token) => token + 1), []);
  const mode: SocialMode = viewerId === null ? "guest" : "member";
  const { state, syncing, toggle } = like;
  const likeValue = useMemo<SocialLikeValue>(() => ({ state, syncing, toggle, mode }), [state, syncing, toggle, mode]);
  const commentsValue = useMemo<SocialCommentsValue>(
    () => ({ itineraryId, ownerId, viewerId, mode, count, adjustCount, focusToken, requestFocus }),
    [itineraryId, ownerId, viewerId, mode, count, adjustCount, focusToken, requestFocus],
  );
  return (
    <LikeContext value={likeValue}>
      <CommentsContext value={commentsValue}>{children}</CommentsContext>
    </LikeContext>
  );
}

export function useSocialLike(): SocialLikeValue {
  const value = use(LikeContext);
  if (value === null) throw new Error("Cần bọc trong SocialProvider.");
  return value;
}

export function useSocialComments(): SocialCommentsValue {
  const value = use(CommentsContext);
  if (value === null) throw new Error("Cần bọc trong SocialProvider.");
  return value;
}
