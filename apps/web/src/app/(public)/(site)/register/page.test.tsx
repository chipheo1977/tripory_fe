import { render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import RegisterPage, { metadata } from "./page";

vi.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams("") }));
vi.mock("@/composition/identity.client", () => ({
  identity: { useRegister: () => ({ mutateAsync: vi.fn() }) },
}));
vi.mock("@/modules/identity/ui/use-session-actions", () => ({
  useSessionActions: () => ({ afterSignIn: vi.fn() }),
}));

it("sets the page title", () => {
  expect(metadata.title).toBe("Tạo tài khoản");
});

it("renders the register form with its heading", () => {
  render(<RegisterPage />);
  expect(screen.getByRole("heading", { level: 1, name: "Tạo tài khoản" })).toBeTruthy();
});
