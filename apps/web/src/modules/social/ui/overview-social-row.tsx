"use client";
// hàng like + số bình luận + "Xem bình luận" ở tab Tổng quan của chế độ Bản đồ (D-21, UI-SPEC §Chế độ Bản đồ).
// tab Ngày không có hàng này; chế độ Bản đồ không có form bình luận. nút tim dùng chung trạng thái với hero (D-03).
// ở 320px (sheet, nội dung 288px) hàng xuống dòng bằng `flex-wrap`, không ẩn phần nào (UI-SPEC FLAG 3, đo lại ở UAT).
import { Button } from "@tripory/ui-web";
import { MessageCircle } from "lucide-react";
import { ConnectedLikeControl } from "./connected-like-control";
import { useSocialComments } from "./social-context";
import { SOCIAL_COPY } from "./social-copy";
import { commentCountLabel } from "./social-format";

export type OverviewSocialRowProps = Readonly<{ visible: boolean; onViewComments(): void }>;

export function OverviewSocialRow({ visible, onViewComments }: OverviewSocialRowProps) {
  const { count } = useSocialComments();
  if (!visible) return null;
  return (
    <div className="flex flex-wrap items-center gap-inline-sm">
      <ConnectedLikeControl visible />
      <span className="text-label font-regular tabular-nums text-muted">{commentCountLabel(count)}</span>
      <Button icon={MessageCircle} onClick={onViewComments} size="md" type="button" variant="ghost">
        {SOCIAL_COPY.viewComments}
      </Button>
    </div>
  );
}
