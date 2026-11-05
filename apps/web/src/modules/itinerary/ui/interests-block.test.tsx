import type { InterestCode } from "@tripory/itinerary";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef, useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { InterestsBlock } from "./interests-block";

type HarnessProps = {
  initial?: readonly InterestCode[];
  onChange?: (next: readonly InterestCode[]) => void;
  disabled?: boolean;
  error?: string;
  firstChipRef?: React.Ref<HTMLButtonElement>;
};

function Harness({ initial = [], onChange, disabled = false, error, firstChipRef }: HarnessProps) {
  const [value, setValue] = useState<readonly InterestCode[]>(initial);
  return (
    <InterestsBlock
      disabled={disabled}
      error={error}
      firstChipRef={firstChipRef}
      onChange={(next) => {
        setValue(next);
        onChange?.(next);
      }}
      value={value}
    />
  );
}

const group = () => screen.getByRole("group", { name: "Sở thích" });

describe("InterestsBlock", () => {
  it("đúng 7 chip theo thứ tự D-70", () => {
    render(<Harness />);
    expect(within(group()).getAllByRole("button").map((chip) => chip.textContent)).toEqual([
      "Lịch sử & Văn hóa",
      "Thiên nhiên",
      "Mua sắm",
      "Ẩm thực & Đồ uống",
      "Giải trí",
      "Sức khỏe",
      "Khác",
    ]);
  });

  it("bật nhiều chip, onChange nhận mảng đã sắp theo danh mục", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    await user.click(screen.getByRole("button", { name: "Mua sắm" }));
    await user.click(screen.getByRole("button", { name: "Thiên nhiên" }));
    expect(onChange).toHaveBeenLastCalledWith(["nature", "shopping"]);
  });

  it("aria-pressed theo value", () => {
    render(<Harness initial={["nature"]} />);
    expect(screen.getByRole("button", { name: "Thiên nhiên" }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByRole("button", { name: "Khác" }).getAttribute("aria-pressed")).toBe("false");
  });

  it("mô tả được aria-describedby trỏ tới", () => {
    render(<Harness />);
    const description = screen.getByText("Chọn một hoặc nhiều.");
    expect(group().getAttribute("aria-describedby")).toBe(description.id);
  });

  it("mũi tên di chuyển, Space bật", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const first = screen.getByRole("button", { name: "Lịch sử & Văn hóa" });
    first.focus();
    await user.keyboard("{ArrowRight}");
    const second = screen.getByRole("button", { name: "Thiên nhiên" });
    expect(document.activeElement).toBe(second);
    await user.keyboard(" ");
    expect(second.getAttribute("aria-pressed")).toBe("true");
  });

  it("disabled vô hiệu chip", () => {
    render(<Harness disabled />);
    expect(screen.getByRole("button", { name: "Thiên nhiên" }).hasAttribute("data-disabled")).toBe(true);
  });

  it("error hiện role alert", () => {
    render(<Harness error="Chọn tối đa 7 sở thích." />);
    expect(screen.getByRole("alert").textContent).toBe("Chọn tối đa 7 sở thích.");
  });

  it("firstChipRef trỏ chip đầu", () => {
    const ref = createRef<HTMLButtonElement>();
    render(<Harness firstChipRef={ref} />);
    expect(ref.current?.textContent).toBe("Lịch sử & Văn hóa");
  });
});
