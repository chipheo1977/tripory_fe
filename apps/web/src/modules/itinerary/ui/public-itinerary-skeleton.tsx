"use client";

// Khung chờ của trang công khai (UI-SPEC §Trạng thái trang công khai): hình dạng bài viết (ảnh bìa, tiêu đề, meta, chip ngày,
// hai khối ngày). Cũng là `fallback` của `SessionRecovery` (D-22) nên không được nháy nội dung 403. Trình đọc màn hình nghe
// "Đang tải lịch trình…"; sau 5 giây hiện câu cold start (`SubmitStatus`, D-31). Mọi `Skeleton` tự `aria-hidden`.
import { Skeleton } from "@tripory/ui-web";
import { SubmitStatus } from "@/components/submit-status";

const CHIPS = [1, 2, 3] as const;
const DAYS = [1, 2] as const;

export function PublicItinerarySkeleton() {
  return (
    <div className="mx-auto flex w-full max-w-content-md flex-col gap-stack-lg">
      <Skeleton className="aspect-(--itinerary-cover-ratio) w-full rounded-container" variant="block" />
      <div className="flex flex-col gap-stack-sm">
        <Skeleton className="w-full" variant="text" />
        <Skeleton className="w-2/3" variant="text" />
      </div>
      <Skeleton className="w-1/2" variant="text" />
      <div className="flex gap-inline-sm">
        {CHIPS.map((chip) => (
          <Skeleton className="h-11 w-24 rounded-pill" key={chip} variant="block" />
        ))}
      </div>
      <div className="flex flex-col gap-stack-lg">
        {DAYS.map((day) => (
          <div className="flex flex-col gap-stack-md" key={day}>
            <Skeleton className="w-1/3" variant="text" />
            <Skeleton className="h-16 w-full" variant="block" />
            <Skeleton className="h-16 w-full" variant="block" />
          </div>
        ))}
      </div>
      <p className="sr-only" role="status">
        Đang tải lịch trình…
      </p>
      <SubmitStatus pending />
    </div>
  );
}
