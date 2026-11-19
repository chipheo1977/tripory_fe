"use client";

// Container client của trang công khai: đọc chế độ xem từ `?view` (D-08) rồi giao cho `PublicViewLayout`. `useSearchParams`
// cần `<Suspense>` dưới Cache Components (docs use-search-params.md); fallback là chính bài viết, nên HTML đầu vẫn có nội dung
// (tiêu đề, các mục ngày) cho khách và crawler. Chỉ nhận `Itinerary` công khai, một boolean và node tài khoản: không token.
import type { Itinerary } from "@tripory/itinerary";
import { Suspense, type ReactNode } from "react";
import type { PublicSocialSlots } from "./public-social";
import { PublicViewLayout } from "./public-view-layout";
import { usePublicView } from "./use-public-view";

export type PublicItineraryViewProps = Readonly<{
  itinerary: Itinerary;
  canEdit: boolean;
  account: ReactNode;
  /** Slot like và bình luận (05.1); fallback của Suspense cũng nhận nên HTML đầu đã có. */
  social?: PublicSocialSlots;
}>;

const noop = (): void => undefined;

function BoundView(props: PublicItineraryViewProps) {
  const { view, setView } = usePublicView();
  return <PublicViewLayout {...props} onViewChange={setView} view={view} />;
}

export function PublicItineraryView(props: PublicItineraryViewProps) {
  return (
    <Suspense fallback={<PublicViewLayout {...props} onViewChange={noop} view="article" />}>
      <BoundView {...props} />
    </Suspense>
  );
}
