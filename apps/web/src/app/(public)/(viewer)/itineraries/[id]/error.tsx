"use client";

import { PublicHeader } from "@/modules/itinerary/ui/public-header";
import { PublicLoadError } from "@/modules/itinerary/ui/public-load-error";
import { PublicStatusFrame } from "@/modules/itinerary/ui/public-status-frame";

type ErrorPageProps = {
  error: Error & { digest?: string };
  reset: () => void;
  retry: () => void;
};

// Lỗi không bắt được (ngoài các kết quả loader đã phân loại): cùng khung với các trạng thái khác, "Thử lại" gọi `retry` của Next.
export default function ErrorPage(props: ErrorPageProps) {
  return (
    <PublicStatusFrame header={<PublicHeader />}>
      <PublicLoadError onRetry={props.retry} />
    </PublicStatusFrame>
  );
}
