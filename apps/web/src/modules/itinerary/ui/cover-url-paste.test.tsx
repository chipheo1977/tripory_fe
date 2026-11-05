import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { CoverUrlPanel } from "./cover-url-panel";

// Lỗi gốc chỉ xuất hiện khi trình duyệt thật phát sự kiện `input` (ô controlled có nút xóa tự render lại trước
// listener của React); phần đó được khóa ở `packages/ui-web/src/atoms/controlled-input-native.test.tsx`.
// Ở đây khóa hành vi mức panel: link dán vào được giữ nguyên, xác nhận và báo lỗi tiếng Việt.
const input = () => screen.getByLabelText("Link ảnh") as HTMLInputElement;

function setup() {
  const onAdd = vi.fn();
  render(<CoverUrlPanel existing={[]} onAdd={onAdd} onCancel={() => undefined} panelId="p" visible />);
  return { user: userEvent.setup(), onAdd };
}

describe("CoverUrlPanel: dán link", () => {
  it("dán link https hợp lệ: giữ giá trị, hiện nút xóa và Thêm gọi onAdd với link đã trim", async () => {
    const { user, onAdd } = setup();
    await user.click(input());
    await user.paste("  https://img.example/a.jpg  ");
    expect(input().value.trim()).toBe("https://img.example/a.jpg");
    expect(screen.getByRole("button", { name: "Xóa link ảnh" })).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Thêm" }));
    expect(onAdd).toHaveBeenCalledWith("https://img.example/a.jpg");
  });

  it("dán link không hợp lệ: chuỗi còn nguyên và Thêm hiện lỗi tiếng Việt", async () => {
    const { user, onAdd } = setup();
    await user.click(input());
    await user.paste("http://img.example/a.jpg");
    expect(input().value).toBe("http://img.example/a.jpg");
    await user.click(screen.getByRole("button", { name: "Thêm" }));
    expect(screen.getByText("Link ảnh phải bắt đầu bằng https://.")).toBeTruthy();
    expect(input().value).toBe("http://img.example/a.jpg");
    expect(onAdd).not.toHaveBeenCalled();
  });
});
