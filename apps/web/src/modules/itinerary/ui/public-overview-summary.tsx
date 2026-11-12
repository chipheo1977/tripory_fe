"use client";

// Thông tin chung ở đầu tab Tổng quan chỉ đọc (D-10, D-133): ảnh bìa, ngày khởi hành, tiêu đề, tác giả, mô tả, "{n} ngày · {m} điểm · {km}".
// Khác `OverviewSummary` của editor: không Badge trạng thái, không "Thêm ảnh bìa", không vùng bấm mở dialog sửa. Tiêu đề là `p`
// (tiêu đề trang đã là `h1` của bài viết / không có `h1` ở chế độ Bản đồ). Tiêu đề và mô tả là text node (không HTML).
import { cn } from "@tripory/ui-web";
import type { ReactNode } from "react";
import { CoverImage } from "./cover-image";
import type { PublicOverviewData } from "./public-format";

export type PublicOverviewSummaryProps = Readonly<{
  data: PublicOverviewData;
  /** Khối tác giả (`AuthorLine`) do nơi gọi dựng; có thể render rỗng. */
  author: ReactNode;
  /** `wide`: cột trái từ `lg`. `compact`: trong sheet dưới `lg`. */
  variant: "wide" | "compact";
}>;

// Chọn class theo biến thể bằng bảng, không rẽ nhánh JSX.
const VARIANT = {
  wide: {
    head: "flex flex-col gap-stack-md",
    headText: "flex flex-col gap-stack-sm",
    cover: "w-full rounded-container",
    title: "text-heading",
    description: "line-clamp-4",
  },
  compact: {
    head: "flex items-start gap-inline-sm",
    headText: "flex min-w-0 flex-1 flex-col gap-inline-xs",
    cover: "w-(--overview-cover-thumb-width) shrink-0 rounded-container",
    title: "text-body line-clamp-2",
    description: "line-clamp-2",
  },
} as const;

function DescriptionLine({ text, className }: Readonly<{ text: string | null; className: string }>) {
  if (text === null || text === "") return null;
  return <p className={cn("break-words whitespace-pre-line text-body text-muted", className)}>{text}</p>;
}

function StartDateText({ label }: Readonly<{ label: string | null }>) {
  if (label === null) return null;
  return <span className="text-label tabular-nums text-muted">{label}</span>;
}

export function PublicOverviewSummary({ data, author, variant }: PublicOverviewSummaryProps) {
  const style = VARIANT[variant];
  return (
    <section aria-label="Thông tin chuyến đi">
      <div className="flex flex-col gap-stack-md">
        <div className={style.head}>
          <CoverImage className={style.cover} fallbackSrc={data.fallbackCoverUrl} src={data.coverImageUrl} />
          <div className={style.headText}>
            <StartDateText label={data.startDateLabel} />
            <p className={cn("break-words font-semibold text-text", style.title)}>{data.title}</p>
          </div>
        </div>
        {author}
        <DescriptionLine className={style.description} text={data.description} />
        <p className="text-label tabular-nums text-muted">{data.metaLine}</p>
      </div>
    </section>
  );
}
