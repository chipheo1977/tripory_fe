import { isApiError } from "@tripory/api-client";
import { selectErrorMessage } from "./select-error-message";

export type MutationFeedback = Readonly<{
  successMessage?: string;
  errorToast?: boolean;
}>;

export type ToastDecision = Readonly<{ variant: "success" | "error"; message: string }> | null;

export const decideMutationSuccess = (feedback?: MutationFeedback): ToastDecision =>
  feedback?.successMessage ? { variant: "success", message: feedback.successMessage } : null;

export function decideMutationError(error: unknown, feedback?: MutationFeedback): ToastDecision {
  if (feedback?.errorToast === false) return null;
  // Hết phiên do `onSessionExpired` của Phase 3 xử lý (chuyển trang đăng nhập), không toast.
  if (isApiError(error) && error.kind === "session_expired") return null;
  const message = selectErrorMessage(error);
  return message === null ? null : { variant: "error", message };
}

// Nối vào `MutationCache` (cùng `meta.feedback` và `retry: false`) ở `composition/query-client.ts`.
// D-10: query đọc lỗi chỉ hiện `ErrorState` + "Thử lại", không có hàm toast cho query.
// D-12: Phase 3 đặt `retry: false` cho QueryClient.
