"use client";

// Bề mặt chung của mọi form editor (UI-SPEC §Ngưỡng Dialog ↔ Sheet): Dialog từ `md`, Sheet modal mở ở mức `expanded`
// dưới `md`. Không đóng khi bấm scrim ở cả hai (mất nội dung do chạm nhầm là lỗi đắt trên mobile). `locked` (đang
// gửi) chặn mọi đường đóng còn lại: Esc, vuốt xuống và nút X (bị vô hiệu qua `closeDisabled`). Không chứa copy nghiệp vụ.
//
// - `closeButton`: form không có nút "Hủy" thì Dialog hiện nút X (Sheet đã có X sẵn); caller thêm chỗ cho X ở tiêu đề.
// - `fixedSnap`: form có chân form dính đáy thì Sheet chỉ có một mức (expanded) và popup có chiều cao cố định.
// - `data-escape-scope`: Esc của Dialog/Drawer Base UI không xét `defaultPrevented`, nên phần tử tự xử lý Esc (ô tìm
//   điểm đến có chữ, khung nhập link ảnh) đặt thuộc tính này và gọi `stopPropagation()` ở keydown của chính nó; surface
//   chỉ chặn đóng khi Esc xảy ra khi focus nằm trong phạm vi đó.
import { Dialog, DialogContent, DialogTitle, Sheet, SheetContent, SheetTitle } from "@tripory/ui-web";
import type { ComponentProps, ReactNode } from "react";
import { useMediaQuery } from "./use-media-query";

/** Trùng breakpoint `md` của Tailwind (768px). Hằng duy nhất của truy vấn này. */
const WIDE_QUERY = "(min-width: 768px)";

/** `true` từ `md` (Dialog), `false` dưới `md` (Sheet). Container dùng để chọn `initialFocus` theo bề mặt. */
export const useIsWide = (): boolean => useMediaQuery(WIDE_QUERY);

export type SurfaceOpenChangeDetails = Readonly<{ reason: string; cancel(): void }>;

export type ResponsiveFormSurfaceProps = Readonly<{
  open: boolean;
  onOpenChange(open: boolean, details?: SurfaceOpenChangeDetails): void;
  /** Gọi sau khi hoạt ảnh mở/đóng xong (dọn form khi đóng xong, không dọn lúc đang chạy hoạt ảnh). */
  onOpenChangeComplete?(open: boolean): void;
  title: ReactNode;
  /** Id của tiêu đề, để form gắn `aria-labelledby`. */
  titleId: string;
  children: ReactNode;
  /** Đang gửi: không cho đóng bằng bất kỳ đường nào. */
  locked: boolean;
  /** Hiện nút X ở Dialog (Sheet luôn có). */
  closeButton?: boolean;
  /** Sheet chỉ một mức, cao cố định. */
  fixedSnap?: boolean;
  /** Sheet bỏ đệm đáy để chân form dính đáy sát mép màn hình; chân form tự đệm vùng an toàn. */
  flushFooter?: boolean;
  /** Ô nhận focus khi mở. Truyền tường minh để không phụ thuộc thứ tự tab mặc định của Dialog/Sheet. */
  initialFocus?: ComponentProps<typeof DialogContent>["initialFocus"];
}>;

const isInsideEscapeScope = (element: Element | null): boolean => element?.closest("[data-escape-scope]") != null;

export function ResponsiveFormSurface({
  open,
  onOpenChange,
  onOpenChangeComplete,
  title,
  titleId,
  children,
  locked,
  closeButton = false,
  fixedSnap = false,
  flushFooter = false,
  initialFocus,
}: ResponsiveFormSurfaceProps) {
  const wide = useIsWide();
  const handleOpenChange = (next: boolean, details?: SurfaceOpenChangeDetails) => {
    if (!next && locked) return;
    if (!next && details?.reason === "escape-key" && isInsideEscapeScope(document.activeElement)) {
      details.cancel();
      return;
    }
    onOpenChange(next, details);
  };

  if (wide) {
    return (
      <Dialog
        disablePointerDismissal
        onOpenChange={handleOpenChange}
        onOpenChangeComplete={onOpenChangeComplete}
        open={open}
      >
        <DialogContent closeDisabled={locked} initialFocus={initialFocus} showCloseButton={closeButton} size="md">
          <DialogTitle className={closeButton ? "pr-touch" : undefined} id={titleId}>
            {title}
          </DialogTitle>
          {children}
        </DialogContent>
      </Dialog>
    );
  }
  return (
    <Sheet
      defaultSnap="expanded"
      disablePointerDismissal
      fixedSnap={fixedSnap}
      modal
      onOpenChange={handleOpenChange}
      onOpenChangeComplete={onOpenChangeComplete}
      open={open}
    >
      <SheetContent closeDisabled={locked} fillSnap={fixedSnap} flushFooter={flushFooter} initialFocus={initialFocus}>
        <SheetTitle id={titleId}>{title}</SheetTitle>
        {children}
      </SheetContent>
    </Sheet>
  );
}
