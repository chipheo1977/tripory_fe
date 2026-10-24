import { render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import NotFound from "./not-found";

vi.mock("next/navigation", () => ({ usePathname: () => "/khong-ton-tai" }));
// AccountSlot đọc cookie qua viewer.server (server-only), không import được dưới Vitest.
vi.mock("@/components/account-slot", () => ({ AccountSlot: () => null }));

it("renders the root 404 in the public shell with only the real home action", () => {
  render(<NotFound />);

  expect(screen.getByRole("heading", { level: 1, name: "Không tìm thấy trang" })).toBeTruthy();
  expect(screen.getByText("Trang bạn đang tìm không tồn tại hoặc đã được di chuyển.")).toBeTruthy();
  const home = screen.getByRole("link", { name: "Về trang chủ" });
  expect(home.getAttribute("href")).toBe("/");
});
