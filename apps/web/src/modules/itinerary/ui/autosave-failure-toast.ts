// Toast lỗi chung của tự lưu "Thông tin chuyến đi" (D-90). Một toast duy nhất (id cố định): lỗi lặp lại cập nhật tại chỗ,
// không chồng. Không tự hết hạn và có "Thử lại" (thay InlineAlert trong form); tắt khi lưu thành công hoặc khi lỗi mới
// không còn là lỗi chung. Lỗi field vẫn gắn vào ô, không đi qua đây.
// "Thử lại" gọi `preventDefault()`: Sonner mặc định xóa toast sau 200 ms khi bấm action, và lần gửi lại lỗi nhanh hơn 200 ms
// sẽ bị xóa cùng toast cũ (cùng id). Giữ toast để lỗi lặp lại cập nhật tại chỗ; `onSuccess` mới tắt toast.
import { notify } from "@tripory/ui-web";
import type { AutosaveFailure } from "./metadata-autosave";

export const AUTOSAVE_FAILURE_TOAST_ID = "itinerary-autosave-failure";

/** Câu cảnh báo lỗi chung của tự lưu; `null` khi không có lỗi chung (lỗi field gắn vào ô). */
export function autosaveAlertText(failure: AutosaveFailure | null): string | null {
  if (failure === null || failure.alert === null) return null;
  return `Chưa lưu được thay đổi. ${failure.alert}`;
}

export function dismissAutosaveFailureToast(): void {
  notify.dismiss(AUTOSAVE_FAILURE_TOAST_ID);
}

/** Hiện (hoặc cập nhật) toast lỗi chung; lỗi không phải lỗi chung thì tắt toast cũ. */
export function showAutosaveFailureToast(failure: AutosaveFailure, retry: () => void): void {
  const text = autosaveAlertText(failure);
  if (text === null) {
    dismissAutosaveFailureToast();
    return;
  }
  notify.error(text, {
    id: AUTOSAVE_FAILURE_TOAST_ID,
    persistent: true,
    action: {
      label: "Thử lại",
      onClick: (event) => {
        event.preventDefault();
        retry();
      },
    },
  });
}
