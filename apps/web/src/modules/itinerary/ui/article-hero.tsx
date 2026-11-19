// Đầu bài viết của trang công khai (D-01, UI-SPEC §ArticleHero): ảnh bìa lớn, tiêu đề, khối tác giả (slot), dòng meta,
// slot social (D-19), mô tả.
// Cố ý không có điểm đến, sở thích, ngày kết thúc (04 D-74, D-76). Mô tả là text node (không HTML).
import type { ReactNode } from "react";
import { CoverImage } from "./cover-image";

export type ArticleHeroProps = Readonly<{
  title: string;
  description: string | null;
  coverImageUrl: string | null;
  fallbackCoverUrl: string | null;
  metaLine: string;
  author: ReactNode;
  /** Slot social (D-19): nút tim, nằm sau dòng meta và trước mô tả. Không truyền thì không có gì. */
  social?: ReactNode;
}>;

function HeroDescription({ text }: Readonly<{ text: string | null }>) {
  if (text === null || text.trim() === "") return null;
  return <p className="break-words whitespace-pre-line text-body text-muted">{text}</p>;
}

export function ArticleHero({
  title,
  description,
  coverImageUrl,
  fallbackCoverUrl,
  metaLine,
  author,
  social,
}: ArticleHeroProps) {
  return (
    <header className="flex flex-col gap-stack-lg">
      {/* Dưới `sm` ảnh tràn hết bề rộng màn hình, không bo góc; từ `sm` nằm trong cột và bo góc. */}
      <CoverImage
        className="-mx-page-inline sm:mx-0 sm:rounded-container"
        fallbackSrc={fallbackCoverUrl}
        loading="eager"
        src={coverImageUrl}
      />
      <div className="flex flex-col gap-stack-md">
        <h1 className="break-words text-display font-semibold text-text">{title}</h1>
        {author}
        <p className="text-label font-regular tabular-nums text-muted">{metaLine}</p>
        {social}
        <HeroDescription text={description} />
      </div>
    </header>
  );
}
