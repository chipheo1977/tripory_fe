import type { Metadata } from "next";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";

export const metadata: Metadata = {
  title: "Không tìm thấy trang · Tripory",
};

export default function NotFound() {
  return (
    <AppShell variant="public">
      <section className="flex flex-1 flex-col items-center justify-center gap-stack-md text-center">
        <div className="flex max-w-content-sm flex-col gap-stack-sm">
          <h1 className="text-display font-semibold text-text">Không tìm thấy trang</h1>
          <p className="text-body text-muted">Trang bạn đang tìm không tồn tại hoặc đã được di chuyển.</p>
        </div>
        <Link
          className="inline-flex min-h-touch items-center justify-center rounded-control bg-primary px-page-inline text-label font-semibold text-primary-foreground hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
          href="/"
        >
          Về trang chủ
        </Link>
      </section>
    </AppShell>
  );
}
