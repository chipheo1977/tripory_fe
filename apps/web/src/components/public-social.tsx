// lớp keo cấp app ghép like và bình luận vào trang công khai (kiến trúc mục 7): `modules/itinerary` chỉ biết
// `PublicSocialFactory`, factory thật ở đây. module RSC (không "use client"), chỉ dựng element.
// - bản nháp hoặc BE cũ không có ba trường đếm thì không dựng gì (D-01).
// - props client chỉ gồm id, số, boolean: không token, không cookie.
// - provider bọc ngoài `PublicItineraryView` (qua `wrap`) để bao cả `Suspense fallback` của view.
import { NO_PUBLIC_SOCIAL, type PublicSocialFactory } from "@/modules/itinerary/ui/public-social";
import { CommentSection } from "@/modules/social/ui/comment-section";
import { ConnectedLikeControl } from "@/modules/social/ui/connected-like-control";
import { SocialProvider } from "@/modules/social/ui/social-context";
import { PublicSocialOverview } from "./public-social-overview";

export const makePublicSocial: PublicSocialFactory = (input) => {
  const { engagement } = input;
  if (!input.isPublished || engagement === null) return NO_PUBLIC_SOCIAL;
  return {
    slots: {
      hero: <ConnectedLikeControl visible />,
      comments: <CommentSection visible />,
      overview: <PublicSocialOverview />,
    },
    wrap: (children) => (
      <SocialProvider
        initialCommentCount={engagement.commentCount}
        initialLike={{ count: engagement.likeCount, liked: engagement.likedByMe }}
        itineraryId={input.itineraryId}
        ownerId={input.ownerId}
        syncLike={input.likeSyncNeeded}
        viewerId={input.viewerId}
      >
        {children}
      </SocialProvider>
    ),
  };
};
