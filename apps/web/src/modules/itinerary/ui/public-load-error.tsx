"use client";

// Lỗi tải trang công khai (mạng, 5xx, timeout, dữ liệu sai hình; D-21). Dùng `EmptyState` thay `ErrorState`: `ErrorState` của
// ui-web có copy cố định "Không thể tải nội dung" còn UI-SPEC khóa copy riêng; không sửa `ui-web`.
import { Button, EmptyState, Icon } from "@tripory/ui-web";
import { TriangleAlert } from "lucide-react";
import { useRouter } from "next/navigation";

export function PublicLoadError({ onRetry }: Readonly<{ onRetry(): void }>) {
  return (
    <div className="mx-auto flex w-full max-w-content-lg flex-1 flex-col justify-center py-page-block lg:py-page-block-wide">
      <EmptyState
        action={
          <Button onClick={onRetry} variant="primary">
            Thử lại
          </Button>
        }
        body="Đã xảy ra sự cố khi tải lịch trình. Kiểm tra kết nối mạng rồi thử lại."
        heading="Không tải được lịch trình"
        icon={<Icon icon={TriangleAlert} size="lg" />}
        variant="page"
      />
    </div>
  );
}

/** "Thử lại" tải lại dữ liệu trang bằng `router.refresh()`, giữ nguyên `?view`. */
export function PublicRefreshError() {
  const router = useRouter();
  return <PublicLoadError onRetry={() => router.refresh()} />;
}
