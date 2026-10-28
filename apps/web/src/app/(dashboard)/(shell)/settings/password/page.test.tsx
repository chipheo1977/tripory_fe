import { render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import ChangePasswordPage, { metadata } from "./page";

vi.mock("@/composition/identity.client", () => ({
  identity: { useChangePassword: () => ({ mutateAsync: vi.fn() }) },
}));
vi.mock("@/modules/identity/ui/use-session-actions", () => ({
  useSessionActions: () => ({ afterPasswordChanged: vi.fn() }),
}));

it("sets the page title", () => {
  expect(metadata.title).toBe("Đổi mật khẩu");
});

it("renders the change password form with its heading", () => {
  render(<ChangePasswordPage />);
  expect(screen.getByRole("heading", { level: 1, name: "Đổi mật khẩu" })).toBeTruthy();
});
