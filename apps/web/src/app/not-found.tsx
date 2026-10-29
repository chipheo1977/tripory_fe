import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import { NotFoundView } from "@/components/not-found-view";

export const metadata: Metadata = {
  title: "Không tìm thấy trang · Tripory",
};

export default function NotFound() {
  return (
    <AppShell variant="public">
      <NotFoundView />
    </AppShell>
  );
}
