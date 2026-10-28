import { Skeleton } from "@tripory/ui-web";

/** Khung chờ của trình chỉnh sửa lịch trình (UI-SPEC "Đang tải"): header, timeline và bản đồ/ảnh bìa. */
export function EditorSkeleton() {
  return (
    <div className="min-h-dvh bg-background">
      <div className="sticky top-0 z-sticky border-b border-border bg-surface pt-[env(safe-area-inset-top)]">
        <div className="flex min-h-header items-center gap-stack-md px-page-inline sm:px-page-inline-md lg:px-page-inline-lg">
          <Skeleton variant="circle" />
          <Skeleton className="w-40" variant="text" />
        </div>
      </div>
      <div className="hidden lg:grid lg:grid-cols-[var(--editor-timeline-width)_1fr]">
        <div className="flex flex-col gap-stack-md p-stack-md">
          <Skeleton variant="text" />
          <Skeleton variant="block" />
          <Skeleton variant="block" />
          <Skeleton variant="block" />
        </div>
        <div className="flex flex-col gap-stack-md p-stack-md">
          <Skeleton className="aspect-(--itinerary-cover-ratio) h-auto" variant="block" />
          <Skeleton variant="text" />
          <Skeleton variant="text" />
        </div>
      </div>
      <div className="flex flex-col gap-stack-md p-stack-md lg:hidden">
        <Skeleton className="aspect-(--itinerary-cover-ratio) h-auto" variant="block" />
        <Skeleton variant="block" />
        <Skeleton variant="block" />
        <Skeleton variant="block" />
      </div>
      <p className="sr-only" role="status">Đang tải lịch trình…</p>
    </div>
  );
}
