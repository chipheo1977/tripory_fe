"use client";

// Chỉ báo lưu của editor (D-30). Luôn có trong DOM (aria-live="polite") để đọc màn hình nhận thay đổi nội dung.
// Ưu tiên: còn lệnh ghi đang chạy/xếp hàng > thao tác nền lỗi > đã từng lưu > trống.
import { useIsMutating } from "@tanstack/react-query";
import { itineraryKeys } from "@tripory/itinerary/react";
import type { ItineraryId } from "@tripory/shared-kernel";
import { Check, CircleAlert } from "lucide-react";
import { Button, Icon, Spinner } from "@tripory/ui-web";
import { useSaveStatus } from "./save-status";

export type SaveIndicatorProps = Readonly<{ itineraryId: ItineraryId }>;

export function SaveIndicator({ itineraryId }: SaveIndicatorProps) {
  const pending = useIsMutating({ mutationKey: itineraryKeys.write(itineraryId) }) > 0;
  const { hasSaved, failure } = useSaveStatus();

  return (
    <div aria-live="polite" className="flex min-w-0 items-center gap-inline-xs">
      {pending ? (
        <>
          <Spinner decorative size="sm" />
          <span className="text-label text-muted">Đang lưu…</span>
        </>
      ) : failure !== null ? (
        <Button className="text-danger" onClick={failure.retry} size="sm" variant="ghost">
          <Icon icon={CircleAlert} size="sm" />
          Lỗi – Thử lại
        </Button>
      ) : hasSaved ? (
        <>
          <Icon className="text-success" icon={Check} size="sm" />
          <span className="text-label text-muted">Đã lưu</span>
        </>
      ) : null}
    </div>
  );
}
