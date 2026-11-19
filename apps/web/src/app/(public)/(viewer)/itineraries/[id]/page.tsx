import { parseItineraryId } from "@tripory/shared-kernel";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { makePublicSocial } from "@/components/public-social";
import { DESTINATION_IMAGE_BASE_URL } from "@/composition/destination-catalog";
import { getPublicItinerary } from "@/composition/itinerary.server";
import { buildPublicMetadata, neutralPublicMetadata } from "@/composition/server/public-metadata";
import { publicSiteUrl } from "@/composition/server/site-url";
import { SessionRecovery } from "@/modules/identity/ui/session-recovery";
import { PublicHeader } from "@/modules/itinerary/ui/public-header";
import { PublicItineraryPage } from "@/modules/itinerary/ui/public-itinerary-page";
import { PublicItinerarySkeleton } from "@/modules/itinerary/ui/public-itinerary-skeleton";
import { PublicStatusFrame } from "@/modules/itinerary/ui/public-status-frame";

type RouteProps = { params: Promise<{ id: string }> };

// Trang công khai (PUB-01..PUB-05): SSR, không gate. `loading.tsx` bọc trang trong Suspense nên `await params` và đọc cookie ở
// đây hợp lệ dưới Cache Components (dynamic-routes.md). `getPublicItinerary` bọc `React.cache`, nên `generateMetadata` và trang
// chỉ gọi BE một lần mỗi request. Id sai dạng: `notFound()` trước mọi lời gọi BE hay đọc cookie. Trạng thái HTTP: `notFound()` sau
// điểm suspend vẫn 200 kèm `noindex` (RESEARCH Pitfall 2, đã chấp nhận). Nếu `next build` báo `blocking-prerender-metadata-runtime`
// thì thêm DynamicMarker (`<Suspense><Connection /></Suspense>`) theo mẫu "With Cache Components" của generate-metadata.md; KHÔNG
// đặt `await connection()` trực tiếp trong trang.
// Like và bình luận (05.1) ghép ở đây: `makePublicSocial` đi từ RSC sang RSC, hàm không qua ranh giới client.
export async function generateMetadata({ params }: RouteProps): Promise<Metadata> {
  const { id } = await params;
  const itineraryId = parseItineraryId(id);
  const siteUrl = publicSiteUrl();
  if (itineraryId === null) return neutralPublicMetadata(siteUrl);
  const result = await getPublicItinerary(itineraryId);
  return buildPublicMetadata({ result, id: itineraryId, siteUrl, destinationImageBaseUrl: DESTINATION_IMAGE_BASE_URL });
}

/** Hiện lúc `SessionRecovery` chờ refresh: cùng khung với `loading.tsx`, không nháy nội dung 403 (D-22). */
function RecoveryFallback() {
  return (
    <PublicStatusFrame header={<PublicHeader />}>
      <PublicItinerarySkeleton />
    </PublicStatusFrame>
  );
}

export default async function PublicItineraryRoute({ params }: RouteProps) {
  const { id } = await params;
  const itineraryId = parseItineraryId(id);
  if (itineraryId === null) notFound();
  return (
    <PublicItineraryPage
      itineraryId={itineraryId}
      recovery={<SessionRecovery fallback={<RecoveryFallback />} />}
      social={makePublicSocial}
    />
  );
}
