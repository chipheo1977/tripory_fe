"use client";
// khung `section#binh-luan` của khối bình luận cuối bài (D-20, UI-SPEC §Khối comment cuối bài).
// `h2` nhận focus bằng script (tabIndex -1); vùng `aria-live` luôn trong DOM để đọc được "Đã xóa bình luận".
// `scroll-mt` dùng biến do `PublicArticle` đặt để không bị header và dải chip che (D-21).
import type { ReactNode } from "react";
import { COMMENTS_HEADING_ID, COMMENTS_SECTION_ID } from "./comment-dom";

export type CommentSectionFrameProps = Readonly<{
  visible: boolean;
  heading: string;
  announcement: string;
  children: ReactNode;
}>;

export function CommentSectionFrame({ visible, heading, announcement, children }: CommentSectionFrameProps) {
  if (!visible) return null;
  return (
    <section
      aria-labelledby={COMMENTS_HEADING_ID}
      className="flex scroll-mt-(--article-scroll-margin) flex-col gap-stack-lg border-t border-border pt-section"
      id={COMMENTS_SECTION_ID}
    >
      <h2
        className="text-heading font-semibold tabular-nums text-text outline-hidden focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
        id={COMMENTS_HEADING_ID}
        tabIndex={-1}
      >
        {heading}
      </h2>
      {children}
      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>
    </section>
  );
}
