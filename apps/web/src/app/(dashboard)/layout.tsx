import type { ReactNode } from "react";
import { AppShell } from "@/components/app-shell";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return <AppShell variant="dashboard">{children}</AppShell>;
}
