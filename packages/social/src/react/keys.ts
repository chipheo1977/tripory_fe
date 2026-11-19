import type { ItineraryId } from '@tripory/shared-kernel';
/** khóa query/mutation của context social. */
export const socialKeys = {
  all: ['social'] as const,
  like: (id: ItineraryId) => ['social', 'like', id] as const,
  likeWrite: (id: ItineraryId) => ['social', 'like-write', id] as const,
  comments: (id: ItineraryId) => ['social', 'comments', id] as const,
  commentWrite: (id: ItineraryId) => ['social', 'comment-write', id] as const,
};
