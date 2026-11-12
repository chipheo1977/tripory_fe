// Header một hàng của trang công khai (UI-SPEC §PublicHeader): logo "Tripory" bên trái, viên thuốc chuyển chế độ ở giữa
// (chỉ từ `lg`, nơi gọi quyết định bằng cách có truyền `toggle` hay không), các nút hành động và ô tài khoản bên phải.
// Không có nút back (trang này được mở từ link ngoài) và không `h1` (tiêu đề là `h1` của bài viết). Cả ba slot đều tùy chọn:
// trang 403 chỉ có logo. Cột giữa luôn có trong DOM để lưới ba cột từ `lg` giữ viên thuốc đúng tâm.
import Link from "next/link";
import type { ReactNode } from "react";

export type PublicHeaderProps = Readonly<{
  toggle?: ReactNode;
  actions?: ReactNode;
  account?: ReactNode;
}>;

export function PublicHeader({ toggle = null, actions = null, account = null }: PublicHeaderProps) {
  return (
    <header className="border-b border-border bg-surface pt-[env(safe-area-inset-top)]">
      <div className="flex min-h-header items-center justify-between gap-inline-xs px-page-inline sm:gap-inline-sm sm:px-page-inline-md lg:grid lg:grid-cols-[1fr_auto_1fr] lg:px-page-inline-lg">
        <Link
          className="flex min-h-touch min-w-touch items-center text-heading font-semibold text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
          href="/"
        >
          Tripory
        </Link>
        <div className="flex justify-self-center">{toggle}</div>
        <div className="flex shrink-0 items-center gap-inline-xs justify-self-end sm:gap-inline-sm">
          {actions}
          {account}
        </div>
      </div>
    </header>
  );
}
