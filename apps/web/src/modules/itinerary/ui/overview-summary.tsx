"use client";

// Thông tin chung ở đầu tab Tổng quan (D-133): ảnh bìa, trạng thái, ngày khởi hành, tiêu đề, mô tả, "{n} ngày · {m} điểm · {km}".
// Cố ý không hiện điểm đến, sở thích (D-76) hay ngày kết thúc: dữ liệu vào đây không có các trường đó.
// Bấm chuột/chạm vào vùng (ngoài nút) mở "Thông tin chuyến đi"; vùng bấm không nhận focus, bàn phím dùng nút thật.
// Tiêu đề và mô tả là text node của React (`whitespace-pre-line`, không HTML).
import { Badge, Button, cn } from "@tripory/ui-web";
import { Pencil } from "lucide-react";
import type { MouseEvent } from "react";
import type { OverviewSummaryData } from "./overview-format";
import { TripCover } from "./trip-cover";

export type OverviewSummaryProps = Readonly<{
  data: OverviewSummaryData;
  /** `wide`: cột trái từ `lg`. `compact`: trong sheet dưới `lg`. */
  variant: "wide" | "compact";
  onEdit(): void;
}>;

// Chọn class theo biến thể bằng bảng, không rẽ nhánh JSX.
const VARIANT = {
  wide: {
    head: "flex flex-col gap-stack-md",
    headText: "flex flex-col gap-stack-sm",
    cover: "w-full rounded-container",
    title: "text-heading",
    description: "line-clamp-4",
    showAddCover: true,
  },
  compact: {
    head: "flex items-start gap-inline-sm",
    headText: "flex min-w-0 flex-1 flex-col gap-inline-xs",
    cover: "w-(--overview-cover-thumb-width) shrink-0 rounded-container",
    title: "text-body line-clamp-2",
    description: "line-clamp-2",
    showAddCover: false,
  },
} as const;

function DescriptionLine({ text, className }: Readonly<{ text: string | null; className: string }>) {
  if (text === null || text === "") return null;
  return <p className={cn("break-words whitespace-pre-line text-body text-muted", className)}>{text}</p>;
}

function StartDateText({ label }: Readonly<{ label: string | null }>) {
  if (label === null) return null;
  return <span>{label}</span>;
}

function statusLabel(isPublic: boolean): string {
  return isPublic ? "Đã xuất bản" : "Nháp";
}

export function OverviewSummary({ data, variant, onEdit }: OverviewSummaryProps) {
  const style = VARIANT[variant];
  // Nút và link tự xử lý click của chúng; chỉ phần nền của vùng mới mở dialog.
  const handleAreaClick = (event: MouseEvent<HTMLDivElement>) => {
    if (event.target instanceof Element && event.target.closest("button, a") !== null) return;
    onEdit();
  };

  return (
    <section aria-label="Thông tin chuyến đi">
      {/* Vùng bấm chuột/chạm: cố ý không có tabindex/role, bàn phím đã có nút "Sửa thông tin" (UI-SPEC). */}
      <div className="flex flex-col gap-stack-md" onClick={handleAreaClick}>
        <div className={style.head}>
          <TripCover
            className={style.cover}
            fallbackSrc={data.fallbackCoverUrl}
            onAdd={onEdit}
            showAddButton={style.showAddCover}
            src={data.coverImageUrl}
          />
          <div className={style.headText}>
            <div className="flex flex-wrap items-center gap-x-inline-sm gap-y-inline-xs text-label tabular-nums text-muted">
              <Badge variant={data.isPublic ? "success" : "neutral"}>{statusLabel(data.isPublic)}</Badge>
              <StartDateText label={data.startDateLabel} />
            </div>
            <p className={cn("break-words font-semibold text-text", style.title)}>{data.title}</p>
          </div>
        </div>
        <DescriptionLine className={style.description} text={data.description} />
        <p className="text-label tabular-nums text-muted">{data.metaLine}</p>
        <div>
          <Button icon={Pencil} onClick={onEdit} size="sm" variant="secondary">
            Sửa thông tin
          </Button>
        </div>
      </div>
    </section>
  );
}
