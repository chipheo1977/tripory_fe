"use client";

// Dòng thay cho danh sách khi chưa có kết quả để chọn: đang tìm, nhắc gõ, không tìm thấy, lỗi kèm "Thử lại" (D-153).
// Lỗi tìm địa điểm không chặn gửi form: người dùng vẫn chuyển sang nhập tọa độ thủ công được.
import { Button, cn, Spinner } from "@tripory/ui-web";
import type { PlaceListStatus } from "./place-list-state";

export type PlaceListMessageProps = Readonly<{
  visible: boolean;
  status: PlaceListStatus;
  message: string | null;
  onRetry(): void;
}>;

function LoadingMark({ visible }: Readonly<{ visible: boolean }>) {
  if (!visible) return null;
  return <Spinner decorative size="sm" />;
}

export function PlaceListMessage({ visible, status, message, onRetry }: PlaceListMessageProps) {
  if (!visible) return null;
  const failed = status === "error";
  return (
    <div className="flex flex-wrap items-center gap-inline-sm px-inline-sm py-inline-xs text-label">
      <LoadingMark visible={status === "loading"} />
      <p className={cn("min-w-0 flex-1", failed ? "text-danger" : "text-muted")}>{message}</p>
      <Button onClick={onRetry} size="sm" type="button" variant="secondary" visible={failed}>
        Thử lại
      </Button>
    </div>
  );
}
