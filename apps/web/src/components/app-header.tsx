"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export type AppHeaderProps = Readonly<{
  /** Ô tài khoản (menu user hoặc nút Đăng nhập) do AppShell bọc Suspense rồi truyền xuống. */
  account: ReactNode;
}>;

export function AppHeader({ account }: AppHeaderProps) {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-(--z-sticky) border-b border-border bg-surface pt-[env(safe-area-inset-top)]">
      <div className="mx-auto flex min-h-header w-full max-w-content-lg items-center justify-between gap-stack-md px-page-inline sm:px-page-inline-md lg:px-page-inline-lg">
        <Link
          aria-current={pathname === "/" ? "page" : undefined}
          className="flex min-h-touch min-w-touch items-center text-heading font-semibold text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
          href="/"
        >
          Tripory
        </Link>
        {account}
      </div>
    </header>
  );
}
