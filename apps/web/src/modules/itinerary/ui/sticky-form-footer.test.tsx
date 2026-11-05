import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { COLD_START_MESSAGE } from "@/components/submit-status";
import { StickyFormFooter } from "./sticky-form-footer";

afterEach(() => {
  vi.useRealTimers();
});

describe("StickyFormFooter", () => {
  it("có Hủy (button) rồi Tạo lịch trình (submit) theo thứ tự DOM", () => {
    render(<StickyFormFooter onCancel={() => undefined} pending={false} />);
    const buttons = screen.getAllByRole("button");
    expect(buttons.map((button) => button.textContent)).toEqual(["Hủy", "Tạo lịch trình"]);
    expect(buttons[0]?.getAttribute("type")).toBe("button");
    expect(buttons[1]?.getAttribute("type")).toBe("submit");
  });

  it("bấm Hủy gọi onCancel", async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    render(<StickyFormFooter onCancel={onCancel} pending={false} />);
    await user.click(screen.getByRole("button", { name: "Hủy" }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("bấm Tạo lịch trình gửi form bao ngoài", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn((event: { preventDefault(): void }) => event.preventDefault());
    render(
      <form onSubmit={onSubmit}>
        <StickyFormFooter onCancel={() => undefined} pending={false} />
      </form>,
    );
    await user.click(screen.getByRole("button", { name: "Tạo lịch trình" }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it("pending: nút gửi hiện Đang tạo…, Hủy bị vô hiệu", () => {
    render(<StickyFormFooter onCancel={() => undefined} pending />);
    expect(screen.getByRole("button", { name: /Đang tạo…/ })).toBeTruthy();
    expect((screen.getByRole("button", { name: "Hủy" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("pending quá 5 giây hiện thông báo máy chủ khởi động", () => {
    vi.useFakeTimers();
    render(<StickyFormFooter onCancel={() => undefined} pending />);
    expect(screen.queryByText(COLD_START_MESSAGE)).toBeNull();
    act(() => {
      vi.advanceTimersByTime(5_000);
    });
    expect(screen.getByText(COLD_START_MESSAGE)).toBeTruthy();
  });

  it("dính đáy và hai nút luôn một hàng", () => {
    const { container } = render(<StickyFormFooter onCancel={() => undefined} pending={false} />);
    const root = container.firstElementChild as HTMLElement;
    expect(root.className).toContain("sticky");
    expect(root.className).toContain("-bottom-(--footer-bleed)");
    expect(container.innerHTML).not.toContain("flex-col");
  });

  it("submitLabel tùy chỉnh được", () => {
    render(<StickyFormFooter onCancel={() => undefined} pending={false} submitLabel="Lưu" />);
    expect(screen.getByRole("button", { name: "Lưu" })).toBeTruthy();
  });

  it("không có chữ liên quan ảnh bìa (D-97)", () => {
    render(<StickyFormFooter onCancel={() => undefined} pending={false} />);
    expect(screen.queryByText(/ảnh bìa/i)).toBeNull();
  });
});
