import { Skeleton } from "@tripory/ui-web";

export default function Loading() {
  return (
    <section className="flex flex-1 flex-col items-center justify-center gap-stack-md" aria-label="Nội dung đang tải">
      <div className="flex w-full max-w-content-sm flex-col items-center gap-stack-md">
        <Skeleton className="max-w-content-md" variant="text" />
        <Skeleton className="max-w-content-sm" variant="text" />
        <Skeleton className="max-w-content-md" variant="block" />
      </div>
      <p className="sr-only" role="status">Đang tải nội dung…</p>
    </section>
  );
}
