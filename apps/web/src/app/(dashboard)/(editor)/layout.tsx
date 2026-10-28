import { Suspense, type ReactNode } from "react";
import { DashboardSessionGate } from "@/modules/identity/ui/dashboard-session-gate";
import { EditorSkeleton } from "@/modules/itinerary/ui/editor-skeleton";

export default function EditorLayout({ children }: { children: ReactNode }) {
  // D-16: layout toàn màn, không AppShell; gate đọc cookie nên nằm trong Suspense (Cache Components).
  return (
    <div className="min-h-dvh bg-background">
      <Suspense fallback={<EditorSkeleton />}>
        <DashboardSessionGate loading={<EditorSkeleton />}>{children}</DashboardSessionGate>
      </Suspense>
    </div>
  );
}
