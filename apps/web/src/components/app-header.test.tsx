import { render, screen } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { AppHeader } from "./app-header";

const { usePathname } = vi.hoisted(() => ({ usePathname: vi.fn<() => string>() }));

vi.mock("next/navigation", () => ({ usePathname }));

const account = <span data-testid="account" />;

beforeEach(() => {
  usePathname.mockReturnValue("/");
});

it("renders only the real home destination and marks it current", () => {
  render(<AppHeader account={account} />);

  const links = screen.getAllByRole("link");
  expect(links).toHaveLength(1);
  expect(links[0]?.textContent).toBe("Tripory");
  expect(links[0]?.getAttribute("href")).toBe("/");
  expect(links[0]?.getAttribute("aria-current")).toBe("page");
  expect(screen.queryByRole("navigation")).toBeNull();
  // Header tự không có button: nút nằm trong ô tài khoản do AppShell truyền vào.
  expect(screen.queryByRole("button")).toBeNull();
});

it("renders the account slot it is given", () => {
  render(<AppHeader account={account} />);

  expect(screen.getByTestId("account")).toBeTruthy();
});

it("keeps the wordmark as a 44px target away from home without fake active state", () => {
  usePathname.mockReturnValue("/itineraries/mine");
  render(<AppHeader account={account} />);

  const wordmark = screen.getByRole("link", { name: "Tripory" });
  expect(wordmark.getAttribute("aria-current")).toBeNull();
  expect(wordmark.className).toContain("min-h-touch");
  expect(wordmark.className).toContain("min-w-touch");
});
