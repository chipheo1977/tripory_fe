import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { CommentList, type CommentListEntry } from "./comment-list";

const entry = (id: string, overrides: Partial<CommentListEntry> = {}): CommentListEntry => ({
  id,
  authorName: `Người ${id}`,
  avatarUrl: null,
  createdAt: "2026-11-12T08:00:00+00:00",
  content: `Nội dung ${id}`,
  canDelete: false,
  ...overrides,
});

describe("CommentList", () => {
  it("visible false không render gì", () => {
    const { container } = render(<CommentList entries={[entry("a")]} now={null} onDelete={() => undefined} visible={false} />);
    expect(container.innerHTML).toBe("");
  });

  it("ol có nhãn và mỗi mục là li theo thứ tự", () => {
    render(<CommentList entries={[entry("a"), entry("b")]} now={null} onDelete={() => undefined} visible />);
    const list = screen.getByRole("list", { name: "Danh sách bình luận" });
    const items = within(list).getAllByRole("listitem");
    expect(items.map((item) => within(item).getByRole("article").id)).toEqual(["binh-luan-a", "binh-luan-b"]);
  });

  it("onDelete nhận đúng id của mục được bấm", async () => {
    const onDelete = vi.fn();
    render(
      <CommentList
        entries={[entry("a", { canDelete: true }), entry("b", { canDelete: true })]}
        now={null}
        onDelete={onDelete}
        visible
      />,
    );
    await userEvent.setup().click(screen.getByRole("button", { name: "Xóa bình luận của Người b" }));
    expect(onDelete).toHaveBeenCalledWith("b");
  });
});
