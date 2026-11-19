// hợp đồng ghép like và bình luận vào trang công khai (D-19..D-22, D-29). module itinerary chỉ biết `ReactNode`:
// factory thật ở `components/public-social.tsx` (plan 05.1-17) vì `modules/*` không import nhau.
// `wrap` để provider của social đứng ngoài `PublicItineraryView`, bao được cả `Suspense fallback` của view.
import type { ItineraryEngagement } from "@tripory/itinerary";
import type { ItineraryId, UserId } from "@tripory/shared-kernel";
import type { ReactNode } from "react";

/** dữ liệu server tính sẵn cho factory; chỉ id, boolean và số (đi qua ranh giới RSC → client). */
export type PublicSocialInput = Readonly<{
  itineraryId: ItineraryId;
  ownerId: UserId;
  viewerId: UserId | null;
  isPublished: boolean;
  engagement: ItineraryEngagement | null;
  /** phiên không tươi nên SSR không kèm Bearer, `likedByMe` cần đọc lại qua BFF (D-27). */
  likeSyncNeeded: boolean;
}>;

export type PublicSocialSlots = Readonly<{ hero: ReactNode; comments: ReactNode; overview: ReactNode }>;

export type PublicSocial = Readonly<{ slots: PublicSocialSlots; wrap(children: ReactNode): ReactNode }>;

export type PublicSocialFactory = (input: PublicSocialInput) => PublicSocial;

/** không có social: ba slot rỗng, `wrap` trả nguyên. */
export const NO_PUBLIC_SOCIAL: PublicSocial = Object.freeze({
  slots: Object.freeze({ hero: null, comments: null, overview: null }),
  wrap: (children: ReactNode) => children,
});
