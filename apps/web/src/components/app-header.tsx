"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserMenu } from "./user-menu";

export function AppHeader() {
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
        <UserMenu />
      </div>
    </header>
  );
}
