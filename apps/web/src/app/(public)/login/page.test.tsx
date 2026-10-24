import { render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import LoginPage, { metadata } from "./page";

vi.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams("") }));
vi.mock("@/composition/identity.client", () => ({
  identity: { useLogin: () => ({ mutateAsync: vi.fn() }) },
}));
vi.mock("@/modules/identity/ui/use-session-actions", () => ({
  useSessionActions: () => ({ afterSignIn: vi.fn() }),
}));

it("sets the page title", () => {
  expect(metadata.title).toBe("Đăng nhập");
});

it("renders the login form with its heading", () => {
  render(<LoginPage />);
  expect(screen.getByRole("heading", { level: 1, name: "Đăng nhập" })).toBeTruthy();
});
