"use client";

// Ảnh bìa dùng chung cho thẻ danh sách và tóm tắt editor (UI-SPEC §ItineraryCard).
// Chuỗi dự phòng (D-86, D-106): ảnh đang hiển thị (`src`) → ảnh mặc định của điểm đến (`fallbackSrc`) → nền + icon.
// Chỉ nhận `https://` (D-25, T-04-33): dữ liệu cũ không https coi như không có ảnh, và không gửi Referer sang host lạ.
// Mỗi URL lỗi tải chỉ bị bỏ một lần; đổi sang URL mới thì được thử lại.
import { Icon } from "@tripory/ui-web";
import { Map, type LucideIcon } from "lucide-react";
import { useState } from "react";

export type CoverImageProps = Readonly<{
  src: string | null;
  /** Ảnh mặc định của điểm đến, chỉ để hiển thị dự phòng (D-86). */
  fallbackSrc?: string | null;
  /** Ảnh trang trí (tên lịch trình nằm ngay cạnh) nên mặc định rỗng. */
  alt?: string;
  className?: string;
  fallbackIcon?: LucideIcon;
}>;

const isHttps = (value: string | null): value is string => value !== null && value.startsWith("https://");

function CoverPicture({ url, alt, onError }: Readonly<{ url: string; alt: string; onError(): void }>) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- URL ngoài do người dùng nhập, không đi qua image optimizer.
    <img
      alt={alt}
      className="size-full object-cover"
      decoding="async"
      key={url}
      loading="lazy"
      onError={onError}
      referrerPolicy="no-referrer"
      src={url}
    />
  );
}

function CoverFallbackSurface({ icon }: Readonly<{ icon: LucideIcon }>) {
  return (
    <div className="flex size-full items-center justify-center bg-surface-muted">
      <Icon className="text-subtle" icon={icon} size="md" />
    </div>
  );
}

function CoverContent({
  current,
  alt,
  icon,
  onError,
}: Readonly<{ current: string | null; alt: string; icon: LucideIcon; onError(): void }>) {
  if (current === null) return <CoverFallbackSurface icon={icon} />;
  return <CoverPicture alt={alt} onError={onError} url={current} />;
}

export function CoverImage({ src, fallbackSrc = null, alt = "", className, fallbackIcon = Map }: CoverImageProps) {
  // Nhớ các URL đã lỗi trong state thay vì cờ cần reset bằng effect.
  const [failed, setFailed] = useState<readonly string[]>([]);
  const candidates = [src, fallbackSrc].filter(isHttps);
  const current = candidates.find((candidate) => !failed.includes(candidate)) ?? null;
  const markFailed = () => {
    if (current !== null) setFailed((list) => [...list, current]);
  };

  return (
    <div className={`aspect-(--itinerary-cover-ratio) overflow-hidden ${className ?? ""}`.trim()}>
      <CoverContent alt={alt} current={current} icon={fallbackIcon} onError={markFailed} />
    </div>
  );
}
