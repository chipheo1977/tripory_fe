import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { DeleteCommentDialog } from "./delete-comment-dialog";

const setup = (props: Partial<Parameters<typeof DeleteCommentDialog>[0]> = {}) => {
  const onOpenChange = vi.fn();
  const onConfirm = vi.fn();
  render(<DeleteCommentDialog onConfirm={onConfirm} onOpenChange={onOpenChange} open pending={false} {...props} />);
  return { onOpenChange, onConfirm, user: userEvent.setup() };
};

function Harness() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)} type="button">
        Mở
      </button>
      <DeleteCommentDialog onConfirm={() => undefined} onOpenChange={setOpen} open={open} pending={false} />
    </>
  );
}

describe("DeleteCommentDialog", () => {
  it("tiêu đề, mô tả, hai nút và focus đầu ở Giữ bình luận", async () => {
    setup();
    const dialog = await screen.findByRole("dialog", { name: "Xóa bình luận?" });
    expect(dialog.textContent).toContain("Bình luận sẽ bị xóa vĩnh viễn. Thao tác này không hoàn tác được.");
    expect(screen.getByRole("button", { name: "Xóa bình luận" })).toBeTruthy();
    const keep = screen.getByRole("button", { name: "Giữ bình luận" });
    await waitFor(() => expect(document.activeElement).toBe(keep));
  });

  it("open false không có dialog", () => {
    setup({ open: false });
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("Xóa gọi onConfirm một lần", async () => {
    const { onConfirm, user } = setup();
    await user.click(await screen.findByRole("button", { name: "Xóa bình luận" }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("Giữ bình luận và Esc gọi onOpenChange(false)", async () => {
    const { onOpenChange, user } = setup();
    await user.click(await screen.findByRole("button", { name: "Giữ bình luận" }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
    onOpenChange.mockClear();
    await user.keyboard("{Escape}");
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("đang xóa: Đang xóa…, Giữ bị khóa, Esc và scrim không đóng, không xác nhận lần hai", async () => {
    const { onOpenChange, onConfirm, user } = setup({ pending: true });
    const confirm = await screen.findByRole("button", { name: /Đang xóa…/ });
    expect(confirm.getAttribute("aria-busy")).toBe("true");
    expect(screen.getByRole("button", { name: "Giữ bình luận" }).hasAttribute("disabled")).toBe(true);
    await user.keyboard("{Escape}");
    await user.click(document.body);
    expect(onOpenChange).not.toHaveBeenCalled();
    await user.click(confirm);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("Esc đóng thì focus quay về nút mở", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const opener = screen.getByRole("button", { name: "Mở" });
    await user.click(opener);
    await screen.findByRole("dialog");
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    await waitFor(() => expect(document.activeElement).toBe(opener));
  });
});
