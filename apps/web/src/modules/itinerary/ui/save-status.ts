"use client";

// Store nhỏ cho chỉ báo lưu của editor (D-30, RESEARCH Pattern 13). "Đang lưu" KHÔNG nằm ở đây: nó suy ra từ
// `useIsMutating({ mutationKey: itineraryKeys.write(id) })`. Store chỉ giữ hai thứ mutation không nhớ được:
// đã từng lưu thành công, và thao tác NỀN nào lỗi (kèm hàm gửi lại đúng thao tác đó).
//
// Quy ước nối: thao tác nền (phụ đề, reorder, xóa waypoint, thêm ngày) truyền
//   onSuccess: () => store.markSaved()
//   onError: (_e, vars) => store.markFailed(() => mutation.mutate(vars))
// còn mutation của form chỉ `onSuccess: () => store.markSaved()` (lỗi form hiện trong form, không thành "Lỗi").
import { createContext, createElement, useContext, useSyncExternalStore, type ReactNode } from "react";

export type SaveStatusSnapshot = Readonly<{
  hasSaved: boolean;
  failure: Readonly<{ retry: () => void }> | null;
}>;

export type SaveStatusStore = Readonly<{
  getSnapshot(): SaveStatusSnapshot;
  subscribe(listener: () => void): () => void;
  markSaved(): void;
  markFailed(retry: () => void): void;
}>;

export function createSaveStatusStore(): SaveStatusStore {
  let snapshot: SaveStatusSnapshot = { hasSaved: false, failure: null };
  const listeners = new Set<() => void>();

  // Snapshot mới mỗi lần đổi (useSyncExternalStore so sánh theo tham chiếu), cùng tham chiếu khi không đổi.
  const update = (next: SaveStatusSnapshot): void => {
    snapshot = next;
    for (const listener of [...listeners]) listener();
  };

  return {
    getSnapshot: () => snapshot,
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    markSaved: () => update({ hasSaved: true, failure: null }),
    markFailed: (retry) => update({ hasSaved: snapshot.hasSaved, failure: { retry } }),
  };
}

const SaveStatusContext = createContext<SaveStatusStore | null>(null);

export function SaveStatusProvider({ store, children }: { store: SaveStatusStore; children: ReactNode }) {
  return createElement(SaveStatusContext.Provider, { value: store }, children);
}

export function useSaveStatusStore(): SaveStatusStore {
  const store = useContext(SaveStatusContext);
  if (store === null) throw new Error("useSaveStatusStore phải nằm trong SaveStatusProvider");
  return store;
}

export function useSaveStatus(): SaveStatusSnapshot {
  const store = useSaveStatusStore();
  return useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
}
