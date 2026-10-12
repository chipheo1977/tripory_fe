import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { UserMenu } from "./user-menu";

it("renders a neutral static account slot without interactive affordances", () => {
  const { container } = render(<UserMenu />);

  expect(screen.getByText("Tài khoản")).toBeTruthy();
  expect(screen.getByRole("img", { name: "Tài khoản" })).toBeTruthy();
  expect(screen.queryByRole("button")).toBeNull();
  expect(screen.queryByRole("menu")).toBeNull();
  expect(screen.queryByRole("link")).toBeNull();
  expect(container.firstElementChild?.className).toContain("min-h-touch");
});
