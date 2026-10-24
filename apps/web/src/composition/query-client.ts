// QueryClient của browser (composition root). Nối chính sách toast của Phase 2 (`lib/feedback`) vào mọi
// mutation thật qua `MutationCache` (FND-05): mutation chỉ khai báo `meta.feedback`, không tự gọi `notify`.
//
// D-10: query đọc lỗi chỉ hiện `ErrorState` + "Thử lại", nên `QueryCache` cố ý không có toast.
import type { ApiError } from "@tripory/api-client";
import { notify } from "@tripory/ui-web";
import { MutationCache, QueryClient } from "@tanstack/react-query";
import { decideMutationError, decideMutationSuccess, type MutationFeedback } from "@/lib/feedback";

declare module "@tanstack/react-query" {
  interface Register {
    mutationMeta: { feedback?: MutationFeedback };
    defaultError: ApiError | Error;
  }
}

/**
 * Mỗi browser session tạo một client (Providers giữ bằng `useState`). Không có QueryClient dùng chung phía
 * server: Phase 3 không prefetch, nên cache không thể rò giữa hai request hay hai tài khoản (T-03-25).
 */
export function makeQueryClient(): QueryClient {
  return new QueryClient({
    // Phase 2 D-12: không tự thử lại. Phát lại request ghi có thể tạo bản ghi trùng, còn 401 đã có
    // `withSessionRefresh` lo.
    defaultOptions: { queries: { retry: false, staleTime: 60_000 }, mutations: { retry: false } },
    mutationCache: new MutationCache({
      // Chữ ký 5.104.2: (data, variables, onMutateResult, mutation, context).
      onSuccess: (_data, _variables, _result, mutation) => {
        const decision = decideMutationSuccess(mutation.meta?.feedback);
        if (decision) notify[decision.variant](decision.message);
      },
      onError: (error, _variables, _result, mutation) => {
        const decision = decideMutationError(error, mutation.meta?.feedback);
        if (decision) notify[decision.variant](decision.message);
      },
    }),
  });
}
