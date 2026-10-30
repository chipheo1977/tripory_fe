"use client";

// Tóm tắt chuyến đi (UI-SPEC §Bố cục desktop/mobile; D-13, D-17, D-28): canvas của Phase 4 trên desktop, nền phía sau
// sheet trên mobile. Phase 5 thay canvas bằng bản đồ và chuyển phần này lên đầu cột trái, nên component chỉ nhận
// dữ liệu và `onEdit`, không biết nó nằm ở slot nào.
//
// Bấm chuột/chạm vào vùng tóm tắt hoặc ảnh bìa mở dialog sửa (D-17). Vùng bấm đó KHÔNG nhận focus và không có role
// giả: bàn phím dùng các nút "Sửa thông tin" / "Thêm ảnh bìa". Tiêu đề và mô tả là text node của React
// (`whitespace-pre-line`, không HTML), nên không có đường XSS (T-04-44).
import type { Itinerary } from "@tripory/itinerary";
import { Badge, Button, cn, Icon } from "@tripory/ui-web";
import { ImagePlus, Pencil } from "lucide-react";
import { useId, type MouseEvent } from "react";
import { CoverImage } from "./cover-image";
import { formatKm, formatStartDate } from "./format";

export type TripSummaryProps = Readonly<{
  itinerary: Itinerary;
  /** `canvas`: vùng phải trên desktop. `compact`: nền mobile sau sheet. */
  variant: "canvas" | "compact";
  onEdit(): void;
}>;

// Cùng điều kiện với `CoverImage`: chỉ `https://` mới coi là có ảnh (D-25).
const hasCover = (url: string | null): boolean => url !== null && url.startsWith("https://");

export function TripSummary({ itinerary, variant, onEdit }: TripSummaryProps) {
  const headingId = useId();
  const canvas = variant === "canvas";
  const distance = formatKm(itinerary.totalDistanceKm);
  const startDate = formatStartDate(itinerary.startDate);

  // Nút và link tự xử lý click của chúng; chỉ phần nền của vùng mới mở dialog.
  const handleAreaClick = (event: MouseEvent<HTMLDivElement>) => {
    if (event.target instanceof Element && event.target.closest("button, a") !== null) return;
    onEdit();
  };

  const coverClassName = canvas ? "rounded-container" : "";

  return (
    <section aria-labelledby={headingId} className={cn("w-full", canvas && "mx-auto max-w-content-md")}>
      <h2 className="sr-only" id={headingId}>
        Thông tin chuyến đi
      </h2>
      {/* Vùng bấm chuột/chạm: cố ý không có tabindex/role, bàn phím đã có nút thật bên trong (UI-SPEC). */}
      <div className={cn("flex flex-col", canvas ? "gap-stack-lg" : "")} onClick={handleAreaClick}>
        {hasCover(itinerary.coverImageUrl) ? (
          <CoverImage className={coverClassName} src={itinerary.coverImageUrl} />
        ) : (
          <div
            className={cn(
              "flex aspect-(--itinerary-cover-ratio) flex-col items-center justify-center gap-stack-sm bg-surface-muted",
              coverClassName,
            )}
          >
            <Icon className="text-subtle" icon={ImagePlus} size="md" />
            <Button onClick={onEdit} size="sm" variant="secondary">
              Thêm ảnh bìa
            </Button>
          </div>
        )}

        <div className={cn("flex flex-col gap-stack-sm", !canvas && "p-stack-md")}>
          <div className="flex flex-wrap items-center gap-x-inline-sm gap-y-inline-xs text-label tabular-nums text-muted">
            <Badge variant={itinerary.isPublic ? "success" : "neutral"}>
              {itinerary.isPublic ? "Đã xuất bản" : "Nháp"}
            </Badge>
            {startDate === null ? null : <span>{startDate}</span>}
            {distance === null ? null : <span>{`Tổng quãng đường: ${distance}`}</span>}
          </div>

          <p className={cn("break-words font-semibold text-text", canvas ? "text-display" : "text-heading")}>
            {itinerary.title}
          </p>

          {itinerary.description === null || itinerary.description === "" ? null : (
            <p className={cn("break-words text-body text-muted whitespace-pre-line", !canvas && "line-clamp-3")}>
              {itinerary.description}
            </p>
          )}

          <div>
            <Button icon={Pencil} onClick={onEdit} size="sm" variant="secondary">
              Sửa thông tin
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
