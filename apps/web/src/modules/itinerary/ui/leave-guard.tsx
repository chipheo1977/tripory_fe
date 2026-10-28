"use client";

// Cảnh báo rời trang của editor (ITIN-10, D-35, RESEARCH Pattern 14, Pitfall 12).
//
// - Đóng/reload tab: `beforeunload` gốc của trình duyệt, chỉ gắn khi bẩn (còn lệnh ghi hoặc form có thay đổi) và
//   gỡ ngay khi hết, để không phá bfcache và không còn listener ở trang bị Activity ẩn (Pitfall 2).
// - Điều hướng trong app (nút back của editor, link trong UserMenu): hỏi bằng `LeaveEditorDialog`, nhưng chỉ khi còn
//   lệnh ghi đang chạy. Form có thay đổi mà không có request thì không chặn in-app (UI-SPEC).
//
// Giới hạn đã biết: nút back của trình duyệt không chặn được trong App Router (popstate do router của Next xử lý) và
// không làm hack `history` giả. Điều hướng SPA không hủy `fetch` đang chạy nên lệnh ghi vẫn tới BE; chỉ mất UI rollback.
import { useIsMutating, useQueryClient } from "@tanstack/react-query";
import { itineraryKeys } from "@tripory/itinerary/react";
import type { ItineraryId } from "@tripory/shared-kernel";
import { Button, Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "@tripory/ui-web";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { NavigationGuard } from "@/components/navigation-guard";

export function useBeforeUnloadWarning(dirty: boolean): void {
  useEffect(() => {
    if (!dirty) return undefined;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      // Một số trình duyệt vẫn đòi returnValue để hiện hộp xác nhận.
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
}

export type LeaveEditorDialogProps = Readonly<{
  open: boolean;
  onStay(): void;
  onLeave(): void;
}>;

export function LeaveEditorDialog({ open, onStay, onLeave }: LeaveEditorDialogProps) {
  const stayRef = useRef<HTMLButtonElement | null>(null);
  return (
    <Dialog onOpenChange={(next) => (next ? undefined : onStay())} open={open}>
      <DialogContent initialFocus={stayRef} size="sm">
        <DialogTitle>Thay đổi đang được lưu. Rời trang?</DialogTitle>
        <DialogDescription>Nếu rời ngay, thay đổi đang gửi có thể không được lưu.</DialogDescription>
        <div className="flex flex-col-reverse gap-inline-sm sm:flex-row sm:justify-end">
          <DialogClose ref={stayRef}>Ở lại</DialogClose>
          <Button onClick={onLeave} variant="danger">
            Rời trang
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export type EditorLeaveGuard = Readonly<{
  /** Truyền vào `NavigationGuardProvider` để link của `UserMenu` đi qua guard. */
  guard: NavigationGuard;
  /** Nút back của editor: chạy `action` ngay, hoặc hỏi trước nếu còn lệnh ghi. */
  requestLeave(action: () => void): void;
  /** Render trong editor. */
  dialog: ReactNode;
}>;

export function useEditorLeaveGuard(input: { itineraryId: ItineraryId; formDirty: boolean }): EditorLeaveGuard {
  const { itineraryId, formDirty } = input;
  const router = useRouter();
  const queryClient = useQueryClient();
  const pending = useIsMutating({ mutationKey: itineraryKeys.write(itineraryId) }) > 0;
  const [waiting, setWaiting] = useState<(() => void) | null>(null);

  useBeforeUnloadWarning(pending || formDirty);

  // Đọc số lệnh ghi lúc bấm (không dùng giá trị của lần render) để guard ổn định và luôn đúng.
  const isSaving = useCallback(
    () => queryClient.isMutating({ mutationKey: itineraryKeys.write(itineraryId) }) > 0,
    [queryClient, itineraryId],
  );

  // Mọi lệnh ghi xong khi dialog đang mở: đóng và đi tiếp. Nghe MutationCache (hệ thống ngoài React) thay vì
  // setState trong thân effect; mỗi lần mutation đổi trạng thái thì kiểm lại số lệnh ghi còn chạy.
  useEffect(() => {
    if (waiting === null) return undefined;
    return queryClient.getMutationCache().subscribe(() => {
      if (isSaving()) return;
      setWaiting(null);
      waiting();
    });
  }, [waiting, queryClient, isSaving]);

  const requestLeave = useCallback(
    (action: () => void) => {
      if (isSaving()) setWaiting(() => action);
      else action();
    },
    [isSaving],
  );

  const guard = useMemo<NavigationGuard>(
    () => ({
      onNavigate(event, href) {
        if (!isSaving()) return;
        event.preventDefault();
        setWaiting(() => () => router.push(href));
      },
    }),
    [isSaving, router],
  );

  const leaveNow = () => {
    if (waiting === null) return;
    const action = waiting;
    setWaiting(null);
    action();
  };

  const dialog = <LeaveEditorDialog onLeave={leaveNow} onStay={() => setWaiting(null)} open={waiting !== null} />;

  return { guard, requestLeave, dialog };
}
