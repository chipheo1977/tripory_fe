"use client";

// Hộp xác nhận xuất bản (ITIN-11; D-39, D-40). Xuất bản không hủy được nên focus đầu ở "Hủy" (T-04-42).
// Lỗi (gồm `Itinerary.CannotPublishEmpty`) hiện InlineAlert trong hộp (`errorToast: false`) và hộp vẫn mở.
// Thành công: toast qua `meta.feedback.successMessage` của MutationCache, đóng hộp, báo `onPublished`.
// Hộp chia sẻ tự mở sau khi đóng xong do editor điều khiển (Phase 5, D-15); editor truyền `successToast={false}` để toast
// không chồng lên hộp đó (U-04) và nghe `onClosed` (hộp đã đóng xong) để mở hộp chia sẻ.
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
import { mapPublishError } from "./form-error-mapping";
import { useSaveStatusStore } from "./save-status";

export type PublishDialogProps = Readonly<{
  itineraryId: ItineraryId;
  open: boolean;
  onOpenChange(open: boolean): void;
  onPublished(): void;
  /** `false` để không phát toast thành công (editor tự phát sau khi hộp chia sẻ đóng). Mặc định `true` như Phase 4. */
  successToast?: boolean;
  /** Hộp đã đóng xong (sau hoạt ảnh). Editor mở hộp chia sẻ ở đây để hai hộp không tranh focus trap. */
  onClosed?(): void;
}>;

const SUCCESS_MESSAGE = "Đã xuất bản lịch trình";

const DESCRIPTION =
  "Ai có link đều xem được lịch trình này. Bạn vẫn sửa được nội dung sau khi xuất bản, nhưng không thể chuyển lại về nháp.";

export function PublishDialog({
  itineraryId,
  open,
  onOpenChange,
  onPublished,
  successToast = true,
  onClosed,
}: PublishDialogProps) {
  const store = useSaveStatusStore();
  const publish = itinerary.usePublish(itineraryId, {
    meta: { feedback: successToast ? { errorToast: false, successMessage: SUCCESS_MESSAGE } : { errorToast: false } },
    onSuccess: () => store.markSaved(),
  });
  const [alert, setAlert] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const pendingRef = useRef(false);
  const cancelRef = useRef<HTMLButtonElement | null>(null);

  const handlePublish = async () => {
    if (pendingRef.current) return;
    pendingRef.current = true;
    setPending(true);
    setAlert(null);
    try {
      await publish.mutateAsync();
    } catch (error) {
      const mapped = mapPublishError(error);
      if (mapped?.alert != null) setAlert(mapped.alert);
      return;
    } finally {
      pendingRef.current = false;
      setPending(false);
    }
    onPublished();
    onOpenChange(false);
  };

  // Đang xuất bản: Esc, scrim và "Hủy" đều không đóng được.
  const handleOpenChange = (next: boolean) => {
    if (!next && pendingRef.current) return;
    onOpenChange(next);
  };

  const handleOpenChangeComplete = (isOpen: boolean) => {
    if (isOpen) return;
    setAlert(null);
    onClosed?.();
  };

  return (
    <Dialog onOpenChange={handleOpenChange} onOpenChangeComplete={handleOpenChangeComplete} open={open}>
      <DialogContent initialFocus={cancelRef} size="sm">
        <DialogTitle>Xuất bản lịch trình?</DialogTitle>
        <DialogDescription>{DESCRIPTION}</DialogDescription>
        <InlineAlert>{alert}</InlineAlert>
        <div className="flex flex-col">
          <div className="flex flex-col-reverse gap-inline-sm sm:flex-row sm:justify-end">
            <DialogClose disabled={pending} ref={cancelRef}>
              Hủy
            </DialogClose>
            <Button loading={pending} loadingLabel="Đang xuất bản…" onClick={() => void handlePublish()}>
              Xuất bản
            </Button>
          </div>
          <SubmitStatus pending={pending} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
