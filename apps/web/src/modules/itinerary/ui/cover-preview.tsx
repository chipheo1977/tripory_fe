"use client";

// Khung xem trước ảnh bìa dưới ô "Link ảnh" (UI-SPEC §CoverUrlPanel). `url` đã hợp lệ (https) và đã qua debounce.
// Ảnh không tải được chỉ báo lỗi, không chặn việc thêm link (D-84).
import { cn, Icon, Skeleton } from "@tripory/ui-web";
import { ImageOff } from "lucide-react";
import { useState } from "react";

type PreviewState = Readonly<{ url: string; outcome: "loaded" | "error" }>;
type Outcome = "loading" | "loaded" | "error";

function PreviewError() {
  return (
    <div className="flex size-full flex-col items-center justify-center gap-stack-sm bg-surface-muted">
      <Icon className="text-subtle" icon={ImageOff} size="lg" />
      <p className="text-label text-muted">Không tải được ảnh từ link này</p>
    </div>
  );
}

function PreviewImage({
  url,
  outcome,
  onResult,
}: Readonly<{ url: string; outcome: Outcome; onResult(outcome: "loaded" | "error"): void }>) {
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element -- URL ngoài do người dùng nhập, không đi qua image optimizer (D-25). */}
      <img
        alt="Xem trước ảnh bìa"
        className={cn("size-full object-cover", outcome === "loading" && "invisible")}
        onError={() => onResult("error")}
        onLoad={() => onResult("loaded")}
        referrerPolicy="no-referrer"
        src={url}
      />
      <PreviewSkeleton visible={outcome === "loading"} />
    </>
  );
}

function PreviewSkeleton({ visible }: Readonly<{ visible: boolean }>) {
  if (!visible) return null;
  return <Skeleton className="absolute inset-0 h-auto" variant="block" />;
}

export function CoverPreview({ url }: Readonly<{ url: string }>) {
  // Nhớ kết quả theo URL (mẫu "điều chỉnh state theo prop" của React): đổi URL tự quay về trạng thái đang tải.
  const [result, setResult] = useState<PreviewState | null>(null);
  const outcome: Outcome = result?.url === url ? result.outcome : "loading";
  return (
    <div className="relative mt-stack-sm aspect-(--itinerary-cover-ratio) overflow-hidden rounded-container">
      <PreviewBody onResult={(next) => setResult({ url, outcome: next })} outcome={outcome} url={url} />
    </div>
  );
}

function PreviewBody({
  url,
  outcome,
  onResult,
}: Readonly<{ url: string; outcome: Outcome; onResult(outcome: "loaded" | "error"): void }>) {
  if (outcome === "error") return <PreviewError />;
  return <PreviewImage onResult={onResult} outcome={outcome} url={url} />;
}
