"use client";

// Bề mặt chung của mọi form editor (UI-SPEC §Ngưỡng Dialog ↔ Sheet): Dialog từ `md`, Sheet modal mở ở mức `expanded`
// dưới `md`. Không đóng khi bấm scrim ở cả hai (mất nội dung do chạm nhầm là lỗi đắt trên mobile). `locked` (đang
// gửi) chặn mọi đường đóng còn lại: Esc, nút "Đóng bảng", vuốt xuống. Không chứa copy nghiệp vụ.
import { Dialog, DialogContent, DialogTitle, Sheet, SheetContent, SheetTitle } from "@tripory/ui-web";
import type { ComponentProps, ReactNode } from "react";
import { useMediaQuery } from "./use-media-query";

/** Trùng breakpoint `md` của Tailwind (768px). */
const WIDE_QUERY = "(min-width: 768px)";

export type ResponsiveFormSurfaceProps = Readonly<{
  open: boolean;
  onOpenChange(open: boolean): void;
  title: ReactNode;
  /** Id của tiêu đề, để form gắn `aria-labelledby`. */
  titleId: string;
  children: ReactNode;
  /** Đang gửi: không cho đóng bằng bất kỳ đường nào. */
  locked: boolean;
  /** Ô nhận focus khi mở (Sheet không tự focus ô đầu vì nút "Thu gọn bảng" nằm trước). */
  initialFocus?: ComponentProps<typeof DialogContent>["initialFocus"];
}>;

export function ResponsiveFormSurface({
  open,
  onOpenChange,
  title,
  titleId,
  children,
  locked,
  initialFocus,
}: ResponsiveFormSurfaceProps) {
  const wide = useMediaQuery(WIDE_QUERY);
  const handleOpenChange = (next: boolean) => {
    if (!next && locked) return;
    onOpenChange(next);
  };

  if (wide) {
    return (
      <Dialog disablePointerDismissal onOpenChange={handleOpenChange} open={open}>
        <DialogContent initialFocus={initialFocus} size="md">
          <DialogTitle id={titleId}>{title}</DialogTitle>
          {children}
        </DialogContent>
      </Dialog>
    );
  }
  return (
    <Sheet defaultSnap="expanded" disablePointerDismissal modal onOpenChange={handleOpenChange} open={open}>
      <SheetContent initialFocus={initialFocus}>
        <SheetTitle id={titleId}>{title}</SheetTitle>
        {children}
      </SheetContent>
    </Sheet>
  );
}
