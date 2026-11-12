"use client";

// Dải "Bản nháp – chỉ bạn thấy" cho chủ xem bản nháp ở trang công khai (D-23). Không phải live region: nội dung có sẵn khi
// trang tải, không cần đọc thành tiếng (UI-SPEC §Dải bản nháp). Dấu gạch giữa là U+2013.
import { Icon } from "@tripory/ui-web";
import { FilePen } from "lucide-react";
import { EditLink } from "./edit-link";

export type DraftStripProps = Readonly<{
  visible: boolean;
  itineraryId: string;
}>;

export function DraftStrip({ visible, itineraryId }: DraftStripProps) {
  if (!visible) return null;
  return (
    <div className="flex items-center justify-between gap-inline-sm border-b border-border bg-surface-muted px-page-inline py-inline-sm sm:px-page-inline-md lg:px-page-inline-lg">
      <p className="flex items-center gap-inline-sm text-label font-semibold text-text">
        <Icon className="text-muted" icon={FilePen} size="sm" />
        Bản nháp – chỉ bạn thấy
      </p>
      <EditLink collapse={false} itineraryId={itineraryId} visible />
    </div>
  );
}
