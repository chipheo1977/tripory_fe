import { render, screen } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { AppHeader } from "./app-header";

const usePathname = vi.fn<() => string>();

vi.mock("next/navigation", () => ({ usePathname }));

beforeEach(() => {
  usePathname.mockReturnValue("/");
});

it("renders only the real home destination and marks it current", () => {
  render(<AppHeader />);

  const links = screen.getAllByRole("link");
  expect(links).toHaveLength(1);
  expect(links[0]?.textContent).toBe("Tripory");
  expect(links[0]?.getAttribute("href")).toBe("/");
  expect(links[0]?.getAttribute("aria-current")).toBe("page");
  expect(screen.queryByRole("navigation")).toBeNull();
  expect(screen.queryByRole("button")).toBeNull();
});

it("keeps the wordmark as a 44px target away from home without fake active state", () => {
  usePathname.mockReturnValue("/itineraries/mine");
  render(<AppHeader />);

  const wordmark = screen.getByRole("link", { name: "Tripory" });
  expect(wordmark.getAttribute("aria-current")).toBeNull();
  expect(wordmark.className).toContain("min-h-touch");
  expect(wordmark.className).toContain("min-w-touch");
});
