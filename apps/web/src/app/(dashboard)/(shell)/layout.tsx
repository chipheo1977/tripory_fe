import { Suspense, type ReactNode } from "react";
import { AppShell } from "@/components/app-shell";
import { DashboardSessionGate } from "@/modules/identity/ui/dashboard-session-gate";
import Loading from "./loading";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  // Gate đọc cookie nên phải nằm trong Suspense (Cache Components); fallback dùng chính skeleton của loading.tsx.
  return (
    <AppShell variant="dashboard">
      <Suspense fallback={<Loading />}>
        <DashboardSessionGate loading={<Loading />}>{children}</DashboardSessionGate>
      </Suspense>
    </AppShell>
  );
}
