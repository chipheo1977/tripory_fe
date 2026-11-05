"use client";

// Nối bộ điều khiển tự lưu (`metadata-autosave.ts`) với mutation `useUpdateMetadata`, store chỉ báo lưu và toast lỗi chung
// (`autosave-failure-toast.ts`: một toast kèm "Thử lại", tắt khi lưu thành công).
// Sống ở cấp editor (không ở dialog): dialog có thể unmount khi còn lệnh chờ, mà lệnh chờ vẫn phải gửi sau lệnh trước.
//
// - Callback `onSuccess/onError` đặt ở CẤP HOOK (bài học 03-11): callback cấp `mutate()` bị bỏ khi component unmount.
// - Dựng controller trong `useState` không có side effect nên an toàn với StrictMode; không có `dispose`, chỉ `flush()`
//   khi dọn (không có việc chờ thì không làm gì nên vòng mount-unmount-mount không gửi oan).
// - Không dùng storage: metadata không có bản nháp (D-107).
import type { ItineraryId } from "@tripory/shared-kernel";
import { useEffect, useLayoutEffect, useMemo, useState, useSyncExternalStore } from "react";
import { itinerary as itineraryHooks } from "@/composition/itinerary.client";
import { dismissAutosaveFailureToast, showAutosaveFailureToast } from "./autosave-failure-toast";
import { mapMetadataError } from "./form-error-mapping";
import {
  createMetadataAutosave,
  type AutosaveFailure,
  type AutosaveState,
  type MetadataAutosave,
} from "./metadata-autosave";
import { useSaveStatusStore } from "./save-status";
import type { MetadataInput } from "@tripory/itinerary";

export type MetadataAutosaveHandle = MetadataAutosave & Readonly<{ state: AutosaveState }>;

type Latest = { mutate: (payload: MetadataInput) => void };

function toFailure(error: unknown): AutosaveFailure {
  const mapped = mapMetadataError(error);
  // null: hết phiên hoặc hủy request. Phiên hết hạn đã được chuyển trang và toast ở nơi khác.
  if (mapped === null) return { alert: null, fieldErrors: {} };
  return { alert: mapped.alert, fieldErrors: { ...mapped.fieldErrors } };
}

export function useMetadataAutosave(itineraryId: ItineraryId): MetadataAutosaveHandle {
  const store = useSaveStatusStore();
  const [latest] = useState<Latest>(() => ({ mutate: () => undefined }));
  const [controller] = useState(() =>
    createMetadataAutosave({
      send: (payload) => latest.mutate(payload),
      // Toast lỗi chung đã hiện ở `onError` (cùng một toast cho lúc form mở và đã đóng); ở đây chỉ báo header.
      onBackgroundFailure: (_failure, retry) => store.markFailed(retry),
    }),
  );

  const update = itineraryHooks.useUpdateMetadata(itineraryId, {
    meta: { feedback: { errorToast: false } },
    // Offline: mặc định 'online' làm lệnh bị tạm dừng, không ra "Lỗi – Thử lại" (D-30, D-90). Chỉ áp cho tự lưu metadata.
    networkMode: "always",
    onSuccess: () => {
      store.markSaved();
      controller.settled({ ok: true });
      dismissAutosaveFailureToast();
    },
    onError: (error) => {
      const failure = toFailure(error);
      controller.settled({ ok: false, failure });
      showAutosaveFailureToast(failure, controller.retry);
    },
  });

  // Layout effect: chạy trước mọi effect thường của component con, nên `request()` gọi từ effect con đã có `mutate` thật.
  useLayoutEffect(() => {
    Object.assign(latest, { mutate: update.mutate });
  });

  useEffect(() => {
    const onVisibilityChange = (): void => {
      if (document.visibilityState === "hidden") controller.flush();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      controller.flush();
    };
  }, [controller]);

  const state = useSyncExternalStore(controller.subscribe, controller.getState, controller.getState);
  return useMemo(() => ({ ...controller, state }), [controller, state]);
}
