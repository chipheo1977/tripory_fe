import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { COMMENT_LOAD_MORE_ID, COMMENT_RETRY_NEXT_ID } from "./comment-dom";
import { CommentLoadMore, CommentLoadMoreError } from "./comment-load-more";

describe("CommentLoadMore", () => {
  it("nút có id và bấm gọi onClick", async () => {
    const onClick = vi.fn();
    render(<CommentLoadMore loading={false} onClick={onClick} visible />);
    const button = screen.getByRole("button", { name: "Xem thêm bình luận" });
    expect(button.id).toBe(COMMENT_LOAD_MORE_ID);
    await userEvent.setup().click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("loading hiện Đang tải…, aria-busy và không gọi onClick", async () => {
    const onClick = vi.fn();
    render(<CommentLoadMore loading onClick={onClick} visible />);
    const button = screen.getByRole("button");
    expect(button.textContent).toContain("Đang tải…");
    expect(button.getAttribute("aria-busy")).toBe("true");
    await userEvent.setup().click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("visible false không render gì", () => {
    const { container } = render(<CommentLoadMore loading={false} onClick={() => undefined} visible={false} />);
    expect(container.innerHTML).toBe("");
  });
});

describe("CommentLoadMoreError", () => {
  it("alert và nút Thử lại tên Thử tải thêm bình luận", async () => {
    const onRetry = vi.fn();
    render(<CommentLoadMoreError onRetry={onRetry} visible />);
    expect(screen.getByRole("alert").textContent).toBe("Không tải thêm được bình luận.");
    const button = screen.getByRole("button", { name: "Thử tải thêm bình luận" });
    expect(button.textContent).toBe("Thử lại");
    expect(button.id).toBe(COMMENT_RETRY_NEXT_ID);
    await userEvent.setup().click(button);
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("visible false không render gì", () => {
    const { container } = render(<CommentLoadMoreError onRetry={() => undefined} visible={false} />);
    expect(container.innerHTML).toBe("");
  });
});
