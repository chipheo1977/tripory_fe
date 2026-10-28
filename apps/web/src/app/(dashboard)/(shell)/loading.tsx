import { Skeleton } from "@tripory/ui-web";

export default function Loading() {
  return (
    <section className="flex flex-1 flex-col gap-stack-lg" aria-label="Nội dung đang tải">
      <Skeleton className="max-w-content-sm" variant="text" />
      <div className="grid gap-stack-md md:grid-cols-2">
        <Skeleton variant="block" />
        <Skeleton variant="block" />
      </div>
      <p className="sr-only" role="status">Đang tải nội dung…</p>
    </section>
  );
}
