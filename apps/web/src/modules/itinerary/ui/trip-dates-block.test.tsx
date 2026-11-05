import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { TripDatesBlock } from "./trip-dates-block";

type HarnessProps = {
  initialStart?: string;
  initialDays?: number;
  daysError?: string;
  disabled?: boolean;
  onStart?: (value: string) => void;
  onDays?: (value: number) => void;
};

function Harness({ initialStart = "", initialDays = 3, daysError, disabled = false, onStart, onDays }: HarnessProps) {
  const [start, setStart] = useState(initialStart);
  const [days, setDays] = useState(initialDays);
  return (
    <TripDatesBlock
      days={{
        value: days,
        error: daysError,
        onChange: (next) => {
          setDays(next);
          onDays?.(next);
        },
      }}
      disabled={disabled}
      start={{
        value: start,
        onChange: (next) => {
          setStart(next);
          onStart?.(next);
        },
      }}
    />
  );
}

const dateInput = () => screen.getByLabelText("Ngày khởi hành") as HTMLInputElement;
const daysInput = () => screen.getByLabelText("Số ngày") as HTMLInputElement;

describe("TripDatesBlock", () => {
  it("ô ngày khởi hành là type=date, tùy chọn, không có ngày kết thúc", () => {
    render(<Harness />);
    expect(dateInput().type).toBe("date");
    expect(screen.queryByText("Không bắt buộc.")).toBeNull();
    expect(screen.queryByText(/kết thúc/i)).toBeNull();
    expect(dateInput().hasAttribute("min")).toBe(false);
  });

  it("nhận ngày quá khứ", async () => {
    const onStart = vi.fn();
    render(<Harness onStart={onStart} />);
    const user = userEvent.setup();
    await user.type(dateInput(), "2020-01-01");
    expect(onStart).toHaveBeenCalled();
    expect(dateInput().value).toBe("2020-01-01");
  });

  it("nút Xóa Ngày khởi hành xóa giá trị", async () => {
    const onStart = vi.fn();
    const user = userEvent.setup();
    render(<Harness initialStart="2026-11-12" onStart={onStart} />);
    await user.click(screen.getByRole("button", { name: "Xóa Ngày khởi hành" }));
    expect(onStart).toHaveBeenLastCalledWith("");
  });

  it("nút giảm/tăng số ngày đổi ±1 và bị vô hiệu ở biên", async () => {
    const onDays = vi.fn();
    const user = userEvent.setup();
    const { rerender } = render(<Harness onDays={onDays} />);
    await user.click(screen.getByRole("button", { name: "Tăng số ngày" }));
    expect(onDays).toHaveBeenLastCalledWith(4);
    await user.click(screen.getByRole("button", { name: "Giảm số ngày" }));
    expect(onDays).toHaveBeenLastCalledWith(3);
    rerender(<Harness initialDays={1} key="min" />);
    expect(screen.getByRole("button", { name: "Giảm số ngày" }).hasAttribute("data-disabled")).toBe(true);
    rerender(<Harness initialDays={30} key="max" />);
    expect(screen.getByRole("button", { name: "Tăng số ngày" }).hasAttribute("data-disabled")).toBe(true);
  });

  it("gõ 45 rồi blur thì kẹp về 30", async () => {
    const onDays = vi.fn();
    const user = userEvent.setup();
    render(<Harness onDays={onDays} />);
    await user.clear(daysInput());
    await user.type(daysInput(), "45");
    await user.tab();
    expect(onDays).toHaveBeenLastCalledWith(30);
    expect(daysInput().value).toBe("30");
  });

  it("có mô tả Từ 1 đến 30 ngày.", () => {
    render(<Harness />);
    expect(screen.getByText("Từ 1 đến 30 ngày.")).toBeTruthy();
  });

  it("Enter trong cả hai ô không gửi form", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn((event: { preventDefault(): void }) => event.preventDefault());
    render(
      <form onSubmit={onSubmit}>
        <Harness />
        <button type="submit">Gửi</button>
      </form>,
    );
    dateInput().focus();
    await user.keyboard("{Enter}");
    daysInput().focus();
    await user.keyboard("{Enter}");
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("days.error đặt aria-invalid trên ô số", () => {
    render(<Harness daysError="Số ngày từ 1 đến 30." />);
    expect(daysInput().getAttribute("aria-invalid")).toBe("true");
    expect(screen.getByText("Số ngày từ 1 đến 30.")).toBeTruthy();
  });
});
