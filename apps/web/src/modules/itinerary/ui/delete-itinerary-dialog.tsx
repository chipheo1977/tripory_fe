"use client";

// Dialog xác nhận xóa lịch trình, dùng chung cho thẻ ở danh sách và menu của editor (ITIN-12, D-42).
// Focus đầu ở "Hủy" (thao tác phá hủy không được là mặc định, T-04-32). Lỗi hiện InlineAlert trong dialog
// (`errorToast: false`); thành công toast qua `meta.feedback.successMessage` của MutationCache, nên toast vẫn
// hiện dù component gọi (thẻ) đã unmount.
import {
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  InlineAlert,
} from "@tripory/ui-web";
import type { ItineraryId } from "@tripory/shared-kernel";
import { useRef, useState } from "react";
import { SubmitStatus } from "@/components/submit-status";
import { itinerary } from "@/composition/itinerary.client";
import { mapDeleteItineraryError } from "./form-error-mapping";

export type DeleteTarget = Readonly<{ id: ItineraryId; title: string; isPublic: boolean }>;

export type DeleteItineraryDialogProps = Readonly<{
  /** `null` = đóng. Giữ nội dung của lần mở gần nhất trong lúc dialog chạy animation đóng. */
  target: DeleteTarget | null;
  onOpenChange(open: boolean): void;
  onDeleted(id: ItineraryId): void;
}>;

const IRREVERSIBLE = "Thao tác này không hoàn tác được.";
const SHARE_LINK_GONE = "Link chia sẻ sẽ không còn mở được.";

export function DeleteItineraryDialog({ target, onOpenChange, onDeleted }: DeleteItineraryDialogProps) {
  const remove = itinerary.useDeleteItinerary({
    meta: { feedback: { errorToast: false, successMessage: "Đã xóa lịch trình" } },
  });
  const [alert, setAlert] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const pendingRef = useRef(false);
  const cancelRef = useRef<HTMLButtonElement | null>(null);

  // Điều chỉnh state ngay trong render (mẫu chính thức của React): nhớ target gần nhất khác null.
  const [shown, setShown] = useState<DeleteTarget | null>(target);
  if (target !== null && target !== shown) setShown(target);

  const handleDelete = async () => {
    if (shown === null || pendingRef.current) return;
    pendingRef.current = true;
    setPending(true);
    setAlert(null);
    try {
      await remove.mutateAsync(shown.id);
    } catch (error) {
      const mapped = mapDeleteItineraryError(error);
      if (mapped?.alert != null) setAlert(mapped.alert);
      return;
    } finally {
      pendingRef.current = false;
      setPending(false);
    }
    onDeleted(shown.id);
    onOpenChange(false);
  };

  // Đang xóa: Esc, scrim và "Hủy" đều không đóng được.
  const handleOpenChange = (next: boolean) => {
    if (!next && pendingRef.current) return;
    onOpenChange(next);
  };

  const handleOpenChangeComplete = (isOpen: boolean) => {
    if (!isOpen) setAlert(null);
  };

  return (
    <Dialog
      onOpenChange={handleOpenChange}
      onOpenChangeComplete={handleOpenChangeComplete}
      open={target !== null}
    >
      <DialogContent initialFocus={cancelRef} size="sm">
        <DialogTitle className="break-words">{`Xóa lịch trình "${shown?.title ?? ""}"?`}</DialogTitle>
        <DialogDescription>
          {IRREVERSIBLE}
          {shown?.isPublic === true ? ` ${SHARE_LINK_GONE}` : null}
        </DialogDescription>
        <InlineAlert>{alert}</InlineAlert>
        <div className="flex flex-col">
          <div className="flex flex-col-reverse gap-inline-sm sm:flex-row sm:justify-end">
            <DialogClose disabled={pending} ref={cancelRef}>
              Hủy
            </DialogClose>
            <Button loading={pending} loadingLabel="Đang xóa…" onClick={() => void handleDelete()} variant="danger">
              Xóa
            </Button>
          </div>
          <SubmitStatus pending={pending} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
