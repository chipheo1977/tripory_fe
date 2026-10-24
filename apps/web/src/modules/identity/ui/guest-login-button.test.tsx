import { render, screen } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { GuestLoginButton } from "./guest-login-button";

const h = vi.hoisted(() => ({ pathname: "/", search: "" }));

vi.mock("next/navigation", () => ({
  usePathname: () => h.pathname,
  useSearchParams: () => new URLSearchParams(h.search),
}));

beforeEach(() => {
  h.pathname = "/";
  h.search = "";
});

it("links to /login with the current path and search as next", () => {
  h.pathname = "/itineraries/mine";
  h.search = "tab=draft";
  render(<GuestLoginButton />);

  const link = screen.getByRole("link", { name: "Đăng nhập" });
  expect(link.getAttribute("href")).toBe("/login?next=%2Fitineraries%2Fmine%3Ftab%3Ddraft");
  expect(link.getAttribute("aria-current")).toBeNull();
});

it("keeps the home page as next", () => {
  render(<GuestLoginButton />);

  expect(screen.getByRole("link", { name: "Đăng nhập" }).getAttribute("href")).toBe("/login?next=%2F");
});

it("drops next on /login and marks the link current, even with a next in the URL", () => {
  h.pathname = "/login";
  h.search = "next=%2Fitineraries%2Fmine";
  render(<GuestLoginButton />);

  const link = screen.getByRole("link", { name: "Đăng nhập" });
  expect(link.getAttribute("href")).toBe("/login");
  expect(link.getAttribute("aria-current")).toBe("page");
});

it("drops next on /register without marking it current", () => {
  h.pathname = "/register";
  render(<GuestLoginButton />);

  const link = screen.getByRole("link", { name: "Đăng nhập" });
  expect(link.getAttribute("href")).toBe("/login");
  expect(link.getAttribute("aria-current")).toBeNull();
});

it("offers no register link to guests", () => {
  render(<GuestLoginButton />);

  expect(screen.queryByText(/Đăng ký/u)).toBeNull();
  expect(screen.getAllByRole("link")).toHaveLength(1);
});
