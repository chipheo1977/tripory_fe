"use client";

// Ảnh bìa dùng chung cho thẻ danh sách và tóm tắt editor (UI-SPEC §ItineraryCard).
// Chỉ nhận `https://` (D-25, T-04-33): dữ liệu cũ không https coi như không có ảnh, và không gửi Referer sang host lạ.
// Lỗi tải ảnh rơi về nền dự phòng; đổi `src` thì thử tải lại.
import { Icon } from "@tripory/ui-web";
import { Map, type LucideIcon } from "lucide-react";
import { useState } from "react";

export type CoverImageProps = Readonly<{
  src: string | null;
  /** Ảnh trang trí (tên lịch trình nằm ngay cạnh) nên mặc định rỗng. */
  alt?: string;
  className?: string;
  fallbackIcon?: LucideIcon;
}>;

const isHttps = (value: string | null): value is string => value !== null && value.startsWith("https://");

export function CoverImage({ src, alt = "", className, fallbackIcon = Map }: CoverImageProps) {
  // Điều chỉnh state trong render (mẫu chính thức của React): nhớ `src` đã lỗi thay vì cờ cần reset bằng effect.
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const showImage = isHttps(src) && failedSrc !== src;
  return (
    <div className={`aspect-(--itinerary-cover-ratio) overflow-hidden ${className ?? ""}`.trim()}>
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element -- URL ngoài do người dùng nhập, không đi qua image optimizer.
        <img
          alt={alt}
          className="size-full object-cover"
          decoding="async"
          loading="lazy"
          onError={() => setFailedSrc(src)}
          referrerPolicy="no-referrer"
          src={src}
        />
      ) : (
        <div className="flex size-full items-center justify-center bg-surface-muted">
          <Icon className="text-subtle" icon={fallbackIcon} size="md" />
        </div>
      )}
    </div>
  );
}
