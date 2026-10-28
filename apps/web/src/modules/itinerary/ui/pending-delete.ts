// Xóa waypoint hoãn commit có hoàn tác (ITIN-07, D-31, RESEARCH Pattern 9, Pitfall 5).
//
// Thuần, không import React: timer, toast và lệnh commit đều được tiêm để test bằng fake timers. Cache vẫn giữ
// waypoint; view lọc theo `pendingIds`, nên refetch không làm điểm "sống lại" và hoàn tác chỉ là bỏ id khỏi tập.

/** Cửa sổ hoàn tác (D-31). Đồng hồ của app, không phải của Sonner. */
export const UNDO_WINDOW_MS = 5_000;

/** `unload`: trang đang đóng/ẩn, phải gửi bằng fetch keepalive (D-32, D-50). */
export type CommitVia = 'normal' | 'unload';

export type PendingDeleteController = Readonly<{
  remove(waypointId: string, name: string): void;
  undo(): void;
  /** Commit ngay lệnh đang chờ (nếu có). Mặc định `normal`. */
  flush(via?: CommitVia): void;
  pendingId(): string | null;
}>;

export type PendingDeleteDeps = Readonly<{
  commit(waypointId: string, via: CommitVia): void;
  showUndo(name: string, handlers: { onUndo(): void; onDismiss(): void }): string | number;
  dismissToast(id: string | number): void;
  onChange(pendingIds: ReadonlySet<string>): void;
  /** Để UI trả focus về điểm vừa được hoàn tác. */
  onUndone?(waypointId: string): void;
  setTimer?: (fn: () => void, ms: number) => unknown;
  clearTimer?: (handle: unknown) => void;
  windowMs?: number;
}>;

type Pending = {
  readonly waypointId: string;
  toastId: string | number;
  timer: unknown;
};

const EMPTY: ReadonlySet<string> = new Set<string>();

export function createPendingDeleteController(deps: PendingDeleteDeps): PendingDeleteController {
  const setTimer = deps.setTimer ?? ((fn, ms) => setTimeout(fn, ms));
  const clearTimer = deps.clearTimer ?? ((handle) => clearTimeout(handle as ReturnType<typeof setTimeout>));
  const windowMs = deps.windowMs ?? UNDO_WINDOW_MS;

  let pending: Pending | null = null;

  // Idempotent: `pending = null` TRƯỚC mọi side effect, vì `dismissToast` làm Sonner gọi lại `onDismiss`.
  const finish = (mode: 'commit' | 'undo', via: CommitVia): void => {
    const current = pending;
    if (current === null) return;
    pending = null;
    clearTimer(current.timer);
    deps.dismissToast(current.toastId);
    deps.onChange(EMPTY);
    if (mode === 'commit') deps.commit(current.waypointId, via);
    else deps.onUndone?.(current.waypointId);
  };

  return {
    remove(waypointId, name) {
      // Xóa điểm thứ hai khi còn lệnh chờ: lệnh cũ commit ngay, chỉ còn một toast.
      finish('commit', 'normal');

      const entry: Pending = { waypointId, toastId: '', timer: undefined };
      // Sonner đóng toast cũ bất đồng bộ rồi mới gọi `onDismiss` của nó; handler chỉ có hiệu lực khi còn là lệnh chờ
      // hiện tại, để toast cũ không commit nhầm lệnh mới.
      const ifCurrent = (mode: 'commit' | 'undo') => () => {
        if (pending === entry) finish(mode, 'normal');
      };
      pending = entry;
      entry.toastId = deps.showUndo(name, { onUndo: ifCurrent('undo'), onDismiss: ifCurrent('commit') });
      entry.timer = setTimer(ifCurrent('commit'), windowMs);
      deps.onChange(new Set([waypointId]));
    },
    undo: () => finish('undo', 'normal'),
    flush: (via = 'normal') => finish('commit', via),
    pendingId: () => pending?.waypointId ?? null,
  };
}
