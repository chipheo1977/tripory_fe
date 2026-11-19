import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { CommentListSkeleton, CommentsEmpty, CommentsLoadError } from "./comment-list-states";

describe("CommentListSkeleton", () => {
  it("3 hàng và status sr-only", () => {
    const { container } = render(<CommentListSkeleton visible />);
    expect(container.querySelectorAll('[data-variant="circle"]')).toHaveLength(3);
    expect(container.querySelectorAll('[data-variant="text"]')).toHaveLength(9);
    const status = screen.getByRole("status");
    expect(status.className).toContain("sr-only");
    expect(status.textContent).toBe("Đang tải bình luận…");
  });

  it("visible false không render gì", () => {
    const { container } = render(<CommentListSkeleton visible={false} />);
    expect(container.innerHTML).toBe("");
  });
});

describe("CommentsEmpty", () => {
  it("member", () => {
    render(<CommentsEmpty mode="member" visible />);
    expect(screen.getByText("Chưa có bình luận nào")).toBeTruthy();
    expect(screen.getByText("Hãy là người đầu tiên chia sẻ cảm nhận về lịch trình này.")).toBeTruthy();
    expect(screen.queryByRole("heading")).toBeNull();
  });

  it("guest không có link hay nút", () => {
    const { container } = render(<CommentsEmpty mode="guest" visible />);
    expect(screen.getByText("Chưa có bình luận nào")).toBeTruthy();
    expect(screen.getByText("Đăng nhập để là người đầu tiên bình luận.")).toBeTruthy();
    expect(screen.queryByRole("link")).toBeNull();
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.queryByRole("heading")).toBeNull();
    expect(container.querySelector("svg")?.getAttribute("aria-hidden")).toBe("true");
  });

  it("visible false không render gì", () => {
    const { container } = render(<CommentsEmpty mode="member" visible={false} />);
    expect(container.innerHTML).toBe("");
  });
});

describe("CommentsLoadError", () => {
  it("alert có tiêu đề, gợi ý và nút Thử lại tên Tải lại bình luận", async () => {
    const onRetry = vi.fn();
    render(<CommentsLoadError onRetry={onRetry} visible />);
    const alert = screen.getByRole("alert");
    expect(alert.textContent).toContain("Không tải được bình luận");
    expect(alert.textContent).toContain("Kiểm tra kết nối mạng rồi thử lại.");
    expect(screen.getByText("Không tải được bình luận").className).toContain("font-semibold");
    const button = screen.getByRole("button", { name: "Tải lại bình luận" });
    expect(button.textContent).toBe("Thử lại");
    await userEvent.setup().click(button);
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("visible false không render gì", () => {
    const { container } = render(<CommentsLoadError onRetry={() => undefined} visible={false} />);
    expect(container.innerHTML).toBe("");
  });
});
