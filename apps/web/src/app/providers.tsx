"use client";

import { Suspense, useState, type ReactNode } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toast } from "@tripory/ui-web";
import { makeQueryClient } from "@/composition/query-client";
import { SessionEffects } from "@/modules/identity/ui/session-effects";
import { SessionKeeper } from "@/modules/identity/ui/session-keeper";

export function Providers({ children }: { children: ReactNode }) {
  // Một QueryClient cho mỗi phiên trình duyệt. Server không dùng QueryClient trong Phase 3 nên cache không
  // thể dùng chung giữa các request hay các tài khoản (PITFALLS P13).
  const [queryClient] = useState(makeQueryClient);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {/* Cả hai dùng usePathname/useSearchParams, bắt buộc nằm trong Suspense khi bật cacheComponents. */}
      <Suspense fallback={null}>
        <SessionEffects />
        <SessionKeeper />
      </Suspense>
      <Toast />
    </QueryClientProvider>
  );
}
