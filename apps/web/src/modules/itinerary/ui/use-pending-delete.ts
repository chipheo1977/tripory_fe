"use client";

// Xóa waypoint hoãn commit có hoàn tác, gắn vào vòng đời trang (ITIN-07, D-31..D-33, D-50, RESEARCH Pattern 9/11).
//
// Controller thuần (`pending-delete.ts`) giữ đồng hồ 5 giây; hook này nối nó với toast, mutation xóa và các thời
// điểm phải commit ngay:
// - đóng/ẩn trang (`pagehide`, `visibilitychange` → hidden): gửi bằng fetch keepalive qua BFF, không refresh phiên;
// - rời route / bị ẩn: cleanup effect. Với Cache Components, Next ẩn trang bằng Activity và cleanup chạy khi ẩn
//   (docs preserving-ui-state), nên flush ở cleanup đúng D-32. `visibilitychange` commit sớm khi đổi tab là chấp nhận
//   được theo D-50 (người dùng đã chọn xóa);
// - bắt đầu kéo (D-33): caller gọi `flush()`.
//
// Lệnh xóa lỗi: hook của itinerary đã rollback cache (waypoint hiện lại) và MutationCache hiện toast lỗi; ở đây chỉ
// ghi thao tác vào store để chỉ báo hiện "Lỗi – Thử lại" (retry gửi lại đúng DELETE).
import type { ItineraryId } from "@tripory/shared-kernel";
import { notify } from "@tripory/ui-web";
import { useCallback, useEffect, useState } from "react";
import { itinerary as itineraryHooks, itineraryUnload } from "@/composition/itinerary.client";
import { createPendingDeleteController, type CommitVia } from "./pending-delete";
import { useSaveStatusStore } from "./save-status";

const NONE: ReadonlySet<string> = new Set<string>();

type Latest = {
  itineraryId: ItineraryId;
  onUndone: ((waypointId: string) => void) | undefined;
  mutate: (variables: { waypointId: string }) => void;
};

// Ghi giá trị mới nhất vào đối tượng dùng chung với controller (ngoài render, chỉ gọi từ effect).
const sync = (target: Latest, next: Latest): void => {
  Object.assign(target, next);
};

export type UsePendingDeleteInput = Readonly<{
  itineraryId: ItineraryId;
  /** Gọi khi người dùng hoàn tác, để UI trả focus về điểm vừa hiện lại. */
  onUndone?(waypointId: string): void;
}>;

export type PendingDelete = Readonly<{
  /** Id đang chờ xóa: view phải ẩn các điểm này dù cache còn giữ chúng. */
  pendingIds: ReadonlySet<string>;
  remove(waypoint: Readonly<{ id: string; name: string }>): void;
  /** Commit ngay lệnh đang chờ (bắt đầu kéo, D-33). */
  flush(): void;
}>;

export function usePendingDelete({ itineraryId, onUndone }: UsePendingDeleteInput): PendingDelete {
  const store = useSaveStatusStore();
  const deleteWaypoint = itineraryHooks.useDeleteWaypoint(itineraryId, {
    onSuccess: () => store.markSaved(),
    onError: (_error, variables) => store.markFailed(() => deleteWaypoint.mutate(variables)),
  });

  // Controller chỉ được dựng một lần; các closure đọc giá trị mới nhất qua đối tượng `latest` (cập nhật trong effect).
  const [latest] = useState<Latest>(() => ({ itineraryId, onUndone, mutate: deleteWaypoint.mutate }));
  useEffect(() => {
    sync(latest, { itineraryId, onUndone, mutate: deleteWaypoint.mutate });
  });

  const [pendingIds, setPendingIds] = useState<ReadonlySet<string>>(NONE);

  // Dựng controller không có side effect (toast chỉ hiện ở `remove`), nên initializer chạy hai lần trong StrictMode
  // chỉ bỏ một bản không dùng, không sinh toast đôi.
  const [controller] = useState(() =>
    createPendingDeleteController({
      commit: (waypointId: string, via: CommitVia) => {
        const current = latest;
        if (via === "unload") {
          // Trang đang đóng: không còn gì để cập nhật, chỉ cần lệnh tới được BE.
          void itineraryUnload.deleteWaypoint(current.itineraryId, waypointId).catch(() => undefined);
          return;
        }
        current.mutate({ waypointId });
      },
      showUndo: (name, handlers) =>
        notify.undoable(`Đã xóa "${name}"`, {
          actionLabel: "Hoàn tác",
          onAction: handlers.onUndo,
          onDismiss: handlers.onDismiss,
        }),
      dismissToast: (id) => {
        notify.dismiss(id);
      },
      onChange: setPendingIds,
      onUndone: (waypointId) => latest.onUndone?.(waypointId),
    }),
  );

  useEffect(() => {
    const onPageHide = (): void => controller.flush("unload");
    const onVisibilityChange = (): void => {
      if (document.visibilityState === "hidden") controller.flush("unload");
    };
    window.addEventListener("pagehide", onPageHide);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      window.removeEventListener("pagehide", onPageHide);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      // Rời route (hoặc Activity ẩn trang): lệnh còn chờ commit ngay. Không có lệnh chờ thì không làm gì, nên vòng
      // mount-unmount-mount của StrictMode không commit oan.
      controller.flush("normal");
    };
  }, [controller]);

  const remove = useCallback(
    (waypoint: Readonly<{ id: string; name: string }>) => controller.remove(waypoint.id, waypoint.name),
    [controller],
  );
  const flush = useCallback(() => controller.flush("normal"), [controller]);

  return { pendingIds, remove, flush };
}
