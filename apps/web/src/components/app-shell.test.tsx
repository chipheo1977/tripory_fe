import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { AppShell } from "./app-shell";

it.each(["public", "dashboard"] as const)("renders the %s shell with accessible landmarks", (variant) => {
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
