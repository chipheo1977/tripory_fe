"use client";

// Luồng "xuất bản -> hộp chia sẻ tự mở -> toast" của editor (D-15, U-04, UI-SPEC §Sau khi xuất bản):
//   1. xuất bản thành công (`onPublished`), hộp xuất bản đóng;
//   2. SAU KHI hộp xuất bản đóng xong (`onPublishClosed`) mới mở hộp chia sẻ, để hai hộp không tranh focus trap (RESEARCH Pitfall 6);
//   3. khi hộp chia sẻ TỰ MỞ đóng xong (`onShareClosed`) mới phát đúng một toast "Đã xuất bản lịch trình" rồi trả focus về
//      nút "Chia sẻ" (chưa có thì nút "Thông tin chuyến đi"). Tại một thời điểm chỉ có một thông báo (hộp rồi toast).
// Mở hộp bằng nút "Chia sẻ" (`openShare`) là mở thủ công: đóng không phát toast.
import { notify } from "@tripory/ui-web";
import { useCallback, useRef, useState, type RefObject } from "react";

const PUBLISHED_MESSAGE = "Đã xuất bản lịch trình";

export type ShareAfterPublish = Readonly<{
  shareOpen: boolean;
  setShareOpen(open: boolean): void;
  /** Nút "Chia sẻ": mở thủ công, đóng không toast. */
  openShare(): void;
  /** `PublishDialog.onPublished`. */
  onPublished(): void;
  /** `PublishDialog.onClosed`. */
  onPublishClosed(): void;
  /** `ShareDialog.onOpenChangeComplete`. */
  onShareClosed(open: boolean): void;
  shareButtonRef: RefObject<HTMLButtonElement | null>;
}>;

export function useShareAfterPublish(input: Readonly<{ fallbackFocusRef: RefObject<HTMLElement | null> }>): ShareAfterPublish {
  const { fallbackFocusRef } = input;
  const [shareOpen, setShareOpen] = useState(false);
  const pendingAuto = useRef(false);
  const autoOpened = useRef(false);
  const shareButtonRef = useRef<HTMLButtonElement | null>(null);

  const openShare = useCallback(() => {
    autoOpened.current = false;
    setShareOpen(true);
  }, []);

  const onPublished = useCallback(() => {
    pendingAuto.current = true;
  }, []);

  const onPublishClosed = useCallback(() => {
    if (!pendingAuto.current) return;
    pendingAuto.current = false;
    autoOpened.current = true;
    setShareOpen(true);
  }, []);

  const onShareClosed = useCallback(
    (open: boolean) => {
      if (open || !autoOpened.current) return;
      autoOpened.current = false;
      notify.success(PUBLISHED_MESSAGE);
      (shareButtonRef.current ?? fallbackFocusRef.current)?.focus();
    },
    [fallbackFocusRef],
  );

  return { shareOpen, setShareOpen, openShare, onPublished, onPublishClosed, onShareClosed, shareButtonRef };
}
