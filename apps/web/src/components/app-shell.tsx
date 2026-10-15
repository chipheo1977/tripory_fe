import { Suspense, type ReactNode } from "react";
import { Skeleton } from "@tripory/ui-web";
import { AccountSlot } from "./account-slot";
import { AppHeader } from "./app-header";

export type AppShellProps = {
  children: ReactNode;
  variant: "public" | "dashboard";
};

export function AppShell({ children, variant }: AppShellProps) {
  return (
    <div
      className="flex min-h-screen min-h-dvh min-w-0 flex-col bg-background pb-[env(safe-area-inset-bottom)] text-text"
      data-variant={variant}
    >
      <a
        className="sr-only z-(--z-modal) rounded-control bg-surface px-page-inline py-inline-sm text-label font-semibold text-text focus:not-sr-only focus:fixed focus:left-0 focus:top-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
        href="#main-content"
      >
        Bỏ qua đến nội dung chính
      </a>
      {/* AccountSlot đọc cookie nên nằm trong Suspense (Cache Components). Fallback là Skeleton tròn 32px, tuyệt
          đối không phải nút "Đăng nhập": người đã đăng nhập không được thấy nút đó nháy lên (D-11). */}
      <AppHeader
        account={
          <Suspense fallback={<Skeleton className="size-control-sm" variant="circle" />}>
            <AccountSlot />
          </Suspense>
        }
      />
      <main
        className="mx-auto flex w-full max-w-content-lg min-w-0 flex-1 flex-col px-page-inline py-page-block sm:px-page-inline-md lg:px-page-inline-lg lg:py-page-block-wide"
        id="main-content"
        tabIndex={-1}
      >
        {children}
      </main>
    </div>
  );
}
