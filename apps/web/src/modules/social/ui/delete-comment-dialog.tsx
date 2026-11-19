"use client";
// hộp xác nhận xóa bình luận (D-12, UI-SPEC §Xóa comment, U-03). chỉ trình bày: cha gọi hook, đóng hộp và toast.
// không trích nội dung bình luận (tránh hộp dài và lộ lại nội dung người khác). focus đầu ở "Giữ bình luận";
// Base UI trả focus về nút đã mở hộp. đang xóa thì Esc, scrim và "Giữ bình luận" không đóng được.
import { Button, Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "@tripory/ui-web";
import { useRef } from "react";
import { SOCIAL_COPY } from "./social-copy";

export type DeleteCommentDialogProps = Readonly<{
  open: boolean;
  pending: boolean;
  onOpenChange(open: boolean): void;
  onConfirm(): void;
}>;

export function DeleteCommentDialog({ open, pending, onOpenChange, onConfirm }: DeleteCommentDialogProps) {
  const keepRef = useRef<HTMLButtonElement | null>(null);
  const handleOpenChange = (next: boolean) => {
    if (!next && pending) return;
    onOpenChange(next);
  };
  return (
    <Dialog onOpenChange={handleOpenChange} open={open}>
      <DialogContent initialFocus={keepRef} size="sm">
        <DialogTitle>{SOCIAL_COPY.deleteTitle}</DialogTitle>
        <DialogDescription>{SOCIAL_COPY.deleteBody}</DialogDescription>
        <div className="flex flex-col-reverse gap-inline-sm sm:flex-row sm:justify-end">
          <DialogClose disabled={pending} ref={keepRef}>
            {SOCIAL_COPY.keep}
          </DialogClose>
          <Button
            loading={pending}
            loadingLabel={SOCIAL_COPY.deleting}
            onClick={onConfirm}
            size="md"
            type="button"
            variant="danger"
          >
            {SOCIAL_COPY.confirmDelete}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
