import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { TripNameBlock, type TripNameBlockProps } from "./trip-name-block";

function Harness(props: Partial<TripNameBlockProps> & { onChangeSpy?: (value: string) => void }) {
  const [value, setValue] = useState(props.value ?? "Chuyến đi mới");
  return (
    <TripNameBlock
      disabled={props.disabled ?? false}
      error={props.error}
      onBlur={props.onBlur ?? (() => undefined)}
      onChange={(next) => {
        setValue(next);
        props.onChangeSpy?.(next);
      }}
      value={value}
    />
  );
}

const input = () => screen.getByLabelText(/Tên chuyến đi/) as HTMLInputElement;

describe("TripNameBlock", () => {
  it("có nhãn và mô tả", () => {
    render(<Harness />);
    expect(input().value).toBe("Chuyến đi mới");
    expect(screen.getByText("Tên tự đổi theo điểm đến cho tới khi bạn sửa.")).toBeTruthy();
  });

  it("gõ gọi onChange từng lần", async () => {
    const user = userEvent.setup();
    const onChangeSpy = vi.fn();
    render(<Harness onChangeSpy={onChangeSpy} value="" />);
    await user.type(input(), "ab");
    expect(onChangeSpy).toHaveBeenCalledTimes(2);
    expect(onChangeSpy).toHaveBeenLastCalledWith("ab");
  });

  it("blur gọi onBlur", async () => {
    const user = userEvent.setup();
    const onBlur = vi.fn();
    render(<Harness onBlur={onBlur} />);
    await user.click(input());
    await user.tab();
    expect(onBlur).toHaveBeenCalledTimes(1);
  });

  it("Enter không gửi form", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn((event: { preventDefault(): void }) => event.preventDefault());
    render(
      <form onSubmit={onSubmit}>
        <Harness />
        <button type="submit">Gửi</button>
      </form>,
    );
    await user.type(input(), "{Enter}");
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("error hiện dưới ô", () => {
    render(<Harness error="Vui lòng nhập tên chuyến đi." />);
    expect(screen.getByText("Vui lòng nhập tên chuyến đi.")).toBeTruthy();
  });

  it("disabled thì chỉ đọc", () => {
    render(<Harness disabled />);
    expect(input().readOnly).toBe(true);
  });
});
