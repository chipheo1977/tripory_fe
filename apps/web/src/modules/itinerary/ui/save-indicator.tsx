"use client";

// Chỉ báo lưu của editor (D-30). Luôn có trong DOM (aria-live="polite") để đọc màn hình nhận thay đổi nội dung.
// Ưu tiên: còn lệnh ghi đang chạy/xếp hàng > thao tác nền lỗi > đã từng lưu > trống.
//
// Nằm ở vùng bên phải header. Dưới `md` chỉ còn icon (chữ chuyển sang `sr-only`, vẫn nằm trong vùng aria-live nên đọc
// màn hình đọc đủ "Đang lưu…" / "Đã lưu" / "Lỗi – Thử lại"); từ `md` hiện đủ chữ. Nút thử lại luôn có vùng chạm 44px.
import { useIsMutating } from "@tanstack/react-query";
import { itineraryKeys } from "@tripory/itinerary/react";
import type { ItineraryId } from "@tripory/shared-kernel";
import { Check, CircleAlert } from "lucide-react";
import { Button, Icon, Spinner } from "@tripory/ui-web";
import type { ReactNode } from "react";
import { useSaveStatus } from "./save-status";

/** Chữ trạng thái: ẩn khỏi mắt dưới `md` nhưng vẫn cho đọc màn hình. */
const LABEL_CLASSES = "sr-only md:not-sr-only";

function StatusLabel({ children }: Readonly<{ children: ReactNode }>) {
  return <span className={`${LABEL_CLASSES} text-label text-muted`}>{children}</span>;
}

function SaveStatus({ pending }: Readonly<{ pending: boolean }>) {
  const { hasSaved, failure } = useSaveStatus();

  if (pending) {
    return (
      <>
        <Spinner decorative size="sm" />
        <StatusLabel>Đang lưu…</StatusLabel>
      </>
    );
  }
  if (failure !== null) {
    return (
      <Button className="min-w-touch text-danger" icon={CircleAlert} onClick={failure.retry} size="sm" variant="ghost">
        <span className={LABEL_CLASSES}>Lỗi – Thử lại</span>
      </Button>
    );
  }
  if (hasSaved) {
    return (
      <>
        <Icon className="text-success" icon={Check} size="sm" />
        <StatusLabel>Đã lưu</StatusLabel>
      </>
    );
  }
  return null;
}

export type SaveIndicatorProps = Readonly<{ itineraryId: ItineraryId }>;

export function SaveIndicator({ itineraryId }: SaveIndicatorProps) {
  const pending = useIsMutating({ mutationKey: itineraryKeys.write(itineraryId) }) > 0;

  return (
    <div aria-live="polite" className="flex min-w-0 items-center gap-inline-xs">
      <SaveStatus pending={pending} />
    </div>
  );
}
