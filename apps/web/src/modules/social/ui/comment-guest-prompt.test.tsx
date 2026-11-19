import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CommentGuestPrompt } from "./comment-guest-prompt";

vi.mock("next/navigation", () => ({
  usePathname: () => "/itineraries/abc",
  useSearchParams: () => new URLSearchParams("view=map"),
}));

describe("CommentGuestPrompt", () => {
  it("hiện lời mời và link giữ trang hiện tại kèm ?view", () => {
    render(<CommentGuestPrompt visible />);
    expect(screen.getByText("Đăng nhập để viết bình luận về lịch trình này.")).toBeTruthy();
    const link = screen.getByRole("link", { name: "Đăng nhập để bình luận" });
    expect(link.getAttribute("href")).toBe(`/login?next=${encodeURIComponent("/itineraries/abc?view=map")}`);
    expect(link.tagName).toBe("A");
  });

  it("không có nút hay ô nhập", () => {
    render(<CommentGuestPrompt visible />);
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.queryByRole("textbox")).toBeNull();
  });

  it("khung có viền và bố cục đúng", () => {
    render(<CommentGuestPrompt visible />);
    const frame = screen.getByText("Đăng nhập để viết bình luận về lịch trình này.").parentElement;
    expect(frame?.className).toContain("rounded-container border border-border bg-surface");
    expect(frame?.className).toContain("flex flex-wrap items-center justify-between gap-inline-sm");
  });

  it("visible false không render gì", () => {
    const { container } = render(<CommentGuestPrompt visible={false} />);
    expect(container.innerHTML).toBe("");
  });
});
