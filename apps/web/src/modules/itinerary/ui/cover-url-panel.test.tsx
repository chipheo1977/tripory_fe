import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CoverUrlPanel } from "./cover-url-panel";

afterEach(() => {
  vi.useRealTimers();
});

function setup(options: { existing?: readonly string[]; visible?: boolean } = {}) {
  const onAdd = vi.fn();
  const onCancel = vi.fn();
  const view = render(
    <CoverUrlPanel
      existing={options.existing ?? []}
      onAdd={onAdd}
      onCancel={onCancel}
      panelId="cover-panel"
      visible={options.visible ?? true}
    />,
  );
  return { onAdd, onCancel, ...view };
}

const input = () => screen.getByLabelText("Link ảnh") as HTMLInputElement;
const GOOD = "https://img.example/a.jpg";

describe("CoverUrlPanel", () => {
  it("visible=false không render gì", () => {
    const { container } = setup({ visible: false });
    expect(container.innerHTML).toBe("");
  });

  it("mở thì focus vào ô Link ảnh và có mô tả", () => {
    setup();
    expect(document.activeElement).toBe(input());
    expect(screen.getByText("Dán link ảnh bắt đầu bằng https://")).toBeTruthy();
  });

  it("Enter với link hợp lệ gọi onAdd với URL đã trim", async () => {
    const user = userEvent.setup();
    const { onAdd } = setup();
    await user.type(input(), `  ${GOOD}  {Enter}`);
    expect(onAdd).toHaveBeenCalledWith(GOOD);
  });

  it.each(["", "http://x.test/a.jpg", "javascript:alert(1)"])("Thêm với %j hiện lỗi https và không gọi onAdd", async (value) => {
    const user = userEvent.setup();
    const { onAdd } = setup();
    if (value !== "") await user.type(input(), value);
    await user.click(screen.getByRole("button", { name: "Thêm" }));
    expect(screen.getByText("Link ảnh phải bắt đầu bằng https://.")).toBeTruthy();
    expect(onAdd).not.toHaveBeenCalled();
  });

  it("URL 501 ký tự hiện lỗi độ dài", async () => {
    const user = userEvent.setup();
    const { onAdd } = setup();
    fireEvent.change(input(), { target: { value: `https://a.test/${"x".repeat(486)}` } });
    await user.click(screen.getByRole("button", { name: "Thêm" }));
    expect(screen.getByText("Link ảnh tối đa 500 ký tự.")).toBeTruthy();
    expect(onAdd).not.toHaveBeenCalled();
  });

  it("URL đã có trong danh sách hiện lỗi trùng; gõ lại thì lỗi tắt", async () => {
    const user = userEvent.setup();
    const { onAdd } = setup({ existing: [GOOD] });
    await user.type(input(), GOOD);
    await user.click(screen.getByRole("button", { name: "Thêm" }));
    expect(screen.getByText("Ảnh này đã có trong danh sách.")).toBeTruthy();
    expect(onAdd).not.toHaveBeenCalled();
    await user.type(input(), "x");
    expect(screen.queryByText("Ảnh này đã có trong danh sách.")).toBeNull();
  });

  it("preview chỉ xuất hiện sau 400 ms với link hợp lệ", () => {
    vi.useFakeTimers();
    setup();
    fireEvent.change(input(), { target: { value: GOOD } });
    expect(screen.queryByAltText("Xem trước ảnh bìa")).toBeNull();
    act(() => {
      vi.advanceTimersByTime(400);
    });
    const preview = screen.getByAltText("Xem trước ảnh bìa");
    expect(preview.getAttribute("referrerpolicy")).toBe("no-referrer");
  });

  it("ảnh lỗi tải vẫn cho Thêm", async () => {
    vi.useFakeTimers();
    const { onAdd } = setup();
    fireEvent.change(input(), { target: { value: GOOD } });
    act(() => {
      vi.advanceTimersByTime(400);
    });
    fireEvent.error(screen.getByAltText("Xem trước ảnh bìa"));
    expect(screen.getByText("Không tải được ảnh từ link này")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Thêm" }));
    expect(onAdd).toHaveBeenCalledWith(GOOD);
  });

  it("Esc gọi onCancel và không nổi bọt ra document", async () => {
    const user = userEvent.setup();
    const { onCancel } = setup();
    const leaked = vi.fn();
    document.addEventListener("keydown", leaked);
    await user.keyboard("{Escape}");
    document.removeEventListener("keydown", leaked);
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(leaked).not.toHaveBeenCalled();
  });

  it("Hủy gọi onCancel; khung có data-escape-scope", async () => {
    const user = userEvent.setup();
    const { onCancel, container } = setup();
    expect(container.querySelector("[data-escape-scope]")).not.toBeNull();
    await user.click(screen.getByRole("button", { name: "Hủy" }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("thứ tự Tab: ô, Xóa link ảnh (khi có chữ), Hủy, Thêm", async () => {
    const user = userEvent.setup();
    setup();
    await user.type(input(), "abc");
    const names = [];
    for (let step = 0; step < 3; step += 1) {
      await user.tab();
      names.push((document.activeElement as HTMLElement).getAttribute("aria-label") ?? document.activeElement?.textContent);
    }
    expect(names).toEqual(["Xóa link ảnh", "Hủy", "Thêm"]);
  });
});
