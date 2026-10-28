import type { Metadata } from "next";
import { Suspense } from "react";
import { MyItinerariesSkeleton, MyItinerariesView } from "@/modules/itinerary/ui/my-itineraries-view";

// Root layout có template `%s · Tripory`, nên tab hiện "Lịch trình của tôi · Tripory".
export const metadata: Metadata = { title: "Lịch trình của tôi" };

export default function MyItinerariesPage() {
  // View đọc `?status=` bằng useSearchParams nên phải nằm trong Suspense (docs use-search-params).
  return (
    <Suspense fallback={<MyItinerariesSkeleton />}>
      <MyItinerariesView />
    </Suspense>
  );
}
