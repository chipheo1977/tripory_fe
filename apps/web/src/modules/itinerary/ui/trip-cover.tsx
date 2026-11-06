"use client";

// Ảnh bìa của tóm tắt chuyến đi, dùng chung cho `TripSummary` và `OverviewSummary` (D-86, D-106).
// Ảnh đang hiển thị → ảnh mặc định của điểm đến → nền + icon, kèm nút "Thêm ảnh bìa" khi `showAddButton`.
import { Button, cn, Icon } from "@tripory/ui-web";
import { ImagePlus } from "lucide-react";
import { CoverImage } from "./cover-image";

// Cùng điều kiện với `CoverImage`: chỉ `https://` mới coi là có ảnh (D-25).
const hasCover = (url: string | null): boolean => url !== null && url.startsWith("https://");

function AddCoverPlaceholder({
  className,
  onAdd,
  showAddButton,
}: Readonly<{ className: string; onAdd(): void; showAddButton: boolean }>) {
  return (
    <div
      className={cn(
        "flex aspect-(--itinerary-cover-ratio) flex-col items-center justify-center gap-stack-sm bg-surface-muted",
        className,
      )}
    >
      <Icon className="text-subtle" icon={ImagePlus} size="md" />
      <Button onClick={onAdd} size="sm" variant="secondary" visible={showAddButton}>
        Thêm ảnh bìa
      </Button>
    </div>
  );
}

export type TripCoverProps = Readonly<{
  src: string | null;
  fallbackSrc: string | null;
  className: string;
  onAdd(): void;
  /** `false` ở bản thu nhỏ (đã có nút "Sửa thông tin" cạnh đó). */
  showAddButton?: boolean;
}>;

export function TripCover({ src, fallbackSrc, className, onAdd, showAddButton = true }: TripCoverProps) {
  const hasAnyCover = hasCover(src) || hasCover(fallbackSrc);
  if (hasAnyCover) return <CoverImage className={className} fallbackSrc={fallbackSrc} src={src} />;
  return <AddCoverPlaceholder className={className} onAdd={onAdd} showAddButton={showAddButton} />;
}
