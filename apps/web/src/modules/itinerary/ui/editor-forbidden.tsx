import Link from "next/link";
import { Lock } from "lucide-react";
import { buttonVariants, EmptyState, Icon } from "@tripory/ui-web";

/**
 * Thân trang 403 của editor (D-45): người không phải chủ lịch trình. Không nhận prop và không hiện tiêu đề hay
 * nội dung lịch trình (T-04-57). Header rút gọn do container render bằng `EditorHeaderMinimal`; link là
 * `next/link` + `buttonVariants` (giữ role link, không phải Button render Link).
 */
export function EditorForbidden() {
  return (
    <>
      <title>Không có quyền truy cập · Tripory</title>
      <div className="mx-auto flex w-full max-w-content-lg flex-1 flex-col justify-center px-page-inline py-page-block sm:px-page-inline-md lg:px-page-inline-lg lg:py-page-block-wide">
        <EmptyState
          action={
            <Link className={buttonVariants({ variant: "primary" })} href="/itineraries/mine">
              Về Lịch trình của tôi
            </Link>
          }
          body="Chỉ người tạo lịch trình mới sửa được."
          heading="Bạn không có quyền sửa lịch trình này"
          icon={<Icon icon={Lock} size="lg" />}
          variant="page"
        />
      </div>
    </>
  );
}
