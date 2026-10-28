import { render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import EditorLayout from "./(dashboard)/(editor)/layout";
import DashboardLayout from "./(dashboard)/(shell)/layout";
import PublicLayout from "./(public)/layout";

vi.mock("@/components/app-shell", () => ({
  AppShell: ({ children, variant }: { children: React.ReactNode; variant: string }) => (
    <div data-testid="shell" data-variant={variant}>{children}</div>
  ),
}));
// Gate đọc cookie (viewer.server có `server-only`); ở đây chỉ cần nó cho nội dung đi qua.
vi.mock("@/modules/identity/ui/dashboard-session-gate", () => ({
  DashboardSessionGate: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

it.each([
  ["public", PublicLayout],
  ["dashboard", DashboardLayout],
] as const)("uses the %s AppShell variant", (variant, Layout) => {
  render(<Layout>Route content</Layout>);
  expect(screen.getByTestId("shell").getAttribute("data-variant")).toBe(variant);
  expect(screen.getByText("Route content")).toBeTruthy();
});

it("renders the editor layout full-screen: children behind the session gate and no AppShell (D-16)", () => {
  render(<EditorLayout>Editor content</EditorLayout>);
  expect(screen.getByText("Editor content")).toBeTruthy();
  expect(screen.queryByTestId("shell")).toBeNull();
});