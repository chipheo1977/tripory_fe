import { render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { AppShell } from "./app-shell";

const h = vi.hoisted(() => ({ pending: false }));

vi.mock("next/navigation", () => ({ usePathname: () => "/" }));
// account-slot kéo theo viewer.server (`server-only`); thay bằng component thật sự "đang đọc phiên" hoặc đã xong.
vi.mock("./account-slot", () => ({
  AccountSlot: () => {
    if (h.pending) throw new Promise(() => undefined);
    return <span data-testid="account-ready" />;
  },
}));

it.each(["public", "dashboard"] as const)("renders the %s shell with accessible landmarks", (variant) => {
  h.pending = false;
  render(<AppShell variant={variant}>Nội dung</AppShell>);

  const skipLink = screen.getByRole("link", { name: "Bỏ qua đến nội dung chính" });
  const main = screen.getByRole("main");

  expect(skipLink.getAttribute("href")).toBe("#main-content");
  expect(main.id).toBe("main-content");
  expect(main.getAttribute("tabindex")).toBe("-1");
  expect(main.textContent).toContain("Nội dung");
  expect(main.className).toContain("max-w-content-lg");
  expect(main.className).toContain("px-page-inline");
});

it("puts the account slot in the header", () => {
  h.pending = false;
  render(<AppShell variant="public">Nội dung</AppShell>);

  expect(screen.getByRole("banner").contains(screen.getByTestId("account-ready"))).toBe(true);
});

it("shows a 32px circular skeleton, never a login button, while the session is being read (D-11)", () => {
  h.pending = true;
  render(<AppShell variant="public">Nội dung</AppShell>);

  const header = screen.getByRole("banner");
  const skeleton = header.querySelector('[data-variant="circle"]');
  expect(skeleton).not.toBeNull();
  expect(skeleton?.className).toContain("size-control-sm");
  expect(skeleton?.getAttribute("aria-hidden")).toBe("true");
  expect(screen.queryByText("Đăng nhập")).toBeNull();
  expect(screen.queryByTestId("account-ready")).toBeNull();
});
