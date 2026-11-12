// Khung chung của các trạng thái trang công khai (403, đang tải/hồi phục phiên, lỗi tải; UI-SPEC §Khung trang công khai).
// Không có AppShell: header do nơi gọi truyền (403 chỉ có logo), `main` có id và `tabIndex=-1` làm đích skip link.
import type { ReactNode } from "react";
import { SkipLink } from "@/components/skip-link";

export type PublicStatusFrameProps = Readonly<{
  header: ReactNode;
  children: ReactNode;
}>;

export function PublicStatusFrame({ header, children }: PublicStatusFrameProps) {
  return (
    <div className="flex min-h-dvh flex-col bg-background pb-[env(safe-area-inset-bottom)] text-text">
      <SkipLink href="#public-content" />
      {header}
      <main
        className="mx-auto flex w-full max-w-content-lg min-w-0 flex-1 flex-col px-page-inline py-page-block outline-hidden sm:px-page-inline-md lg:px-page-inline-lg lg:py-page-block-wide"
        id="public-content"
        tabIndex={-1}
      >
        {children}
      </main>
    </div>
  );
}
