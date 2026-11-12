// Liên kết "Bỏ qua đến nội dung chính": ẩn cho tới khi nhận focus bằng bàn phím, rồi nhảy thẳng tới `href`. Cùng kiểu lớp với
// skip link của `AppShell` (không sửa AppShell để khỏi đụng test hiện có); dùng cho các khung toàn màn hình không có AppShell.
export function SkipLink({ href }: Readonly<{ href: string }>) {
  return (
    <a
      className="sr-only z-modal rounded-control bg-surface px-page-inline py-inline-sm text-label font-semibold text-text focus:not-sr-only focus:fixed focus:left-0 focus:top-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
      href={href}
    >
      Bỏ qua đến nội dung chính
    </a>
  );
}
