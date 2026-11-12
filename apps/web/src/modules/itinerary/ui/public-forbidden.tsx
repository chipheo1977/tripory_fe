"use client";

// `buttonVariants` nằm trong file `'use client'` của ui-web nên không gọi được từ RSC: khối này phải là client component
// (render SSR như thường). Phát hiện khi chạy `next start` với BE giả; test jsdom không bắt được lỗi ranh giới RSC.
import { buttonVariants, EmptyState, Icon } from "@tripory/ui-web";
import { Lock } from "lucide-react";
import Link from "next/link";

/**
 * Thân trang 403 của trang công khai (D-21): khách hoặc người không phải chủ mở bản nháp. Không nhận prop và không hiện
 * tiêu đề, ảnh, tác giả hay bất kỳ dữ liệu lịch trình nào (T-04-57, T-05-45). Không có nút Đăng nhập (tránh dò bản nháp).
 * Tiêu đề tài liệu do `generateMetadata` đặt (trung tính). Khung ngang do `PublicStatusFrame` đặt.
 */
export function PublicForbidden() {
  return (
    <div className="mx-auto flex w-full max-w-content-lg flex-1 flex-col justify-center py-page-block lg:py-page-block-wide">
      <EmptyState
        action={
          <Link className={buttonVariants({ variant: "primary" })} href="/">
            Về trang chủ
          </Link>
        }
        body="Chỉ người tạo xem được bản nháp."
        heading="Lịch trình này chưa được xuất bản"
        icon={<Icon icon={Lock} size="lg" />}
        variant="page"
      />
    </div>
  );
}
