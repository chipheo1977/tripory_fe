import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { LikeControl, type LikeControlProps } from "./like-control";

const base: LikeControlProps = {
  visible: true,
  mode: "member",
  count: 12,
  liked: false,
  syncing: false,
  loginHref: "/login?next=%2Fitineraries%2Fabc",
  onToggle: () => undefined,
};
const setup = (overrides: Partial<LikeControlProps> = {}) => {
  const onToggle = vi.fn();
  const view = render(<LikeControl {...base} onToggle={onToggle} {...overrides} />);
  return { ...view, onToggle: (overrides.onToggle as typeof onToggle | undefined) ?? onToggle };
};
const svg = (element: HTMLElement) => element.querySelector("svg") as SVGElement;
const description = (element: HTMLElement) =>
  (element.getAttribute("aria-describedby") ?? "")
    .split(" ")
    .map((id) => document.getElementById(id)?.textContent ?? "")
    .join(" ");

describe("LikeControl member", () => {
  it("chưa thích", () => {
    setup();
    const button = screen.getByRole("button", { name: "Thích lịch trình" });
    expect(button.getAttribute("aria-pressed")).toBe("false");
    expect(button.textContent).toContain("12");
    expect(description(button)).toBe("12 lượt thích");
    expect(svg(button).getAttribute("class")).not.toContain("fill-current");
  });

  it("đã thích: tên, aria-pressed, tim đầy màu primary, nền primary-subtle", () => {
    setup({ count: 13, liked: true });
    const button = screen.getByRole("button", { name: "Bỏ thích lịch trình" });
    expect(button.getAttribute("aria-pressed")).toBe("true");
    expect(description(button)).toBe("13 lượt thích");
    expect(svg(button).getAttribute("class")).toContain("fill-current");
    expect(svg(button).getAttribute("class")).toContain("text-primary");
    expect(button.className).toContain("bg-primary-subtle!");
    expect(button.className).toContain("border-primary-border!");
  });

  it.each([
    [0, "0"],
    [1234, "1.234"],
  ])("count %d hiện %s", (count, text) => {
    setup({ count });
    const button = screen.getByRole("button");
    expect(button.textContent).toContain(text);
    expect(description(button)).toBe(`${text} lượt thích`);
  });

  it("bấm, Enter và Space gọi onToggle, focus giữ trên nút", async () => {
    const onToggle = vi.fn();
    setup({ onToggle });
    const user = userEvent.setup();
    const button = screen.getByRole("button");
    await user.click(button);
    expect(document.activeElement).toBe(button);
    await user.keyboard("{Enter}");
    await user.keyboard(" ");
    expect(onToggle).toHaveBeenCalledTimes(3);
    expect(document.activeElement).toBe(button);
  });

  it("đang đồng bộ: khóa, aria-busy, không gọi, không spinner", async () => {
    const onToggle = vi.fn();
    const { container } = setup({ syncing: true, onToggle });
    const button = screen.getByRole("button");
    expect(button.hasAttribute("disabled") || button.hasAttribute("data-disabled")).toBe(true);
    expect(button.getAttribute("aria-busy")).toBe("true");
    await userEvent.setup().click(button);
    expect(onToggle).not.toHaveBeenCalled();
    expect(container.querySelector('[role="progressbar"], [role="status"]')).toBeNull();
  });
});

describe("LikeControl guest", () => {
  it("là link tới đăng nhập, không aria-pressed, có mô tả", () => {
    setup({ mode: "guest" });
    const link = screen.getByRole("link", { name: "Đăng nhập để thích lịch trình" });
    expect(link.getAttribute("href")).toBe(base.loginHref);
    expect(link.hasAttribute("aria-pressed")).toBe(false);
    expect(description(link)).toBe("12 lượt thích");
    expect(link.textContent).toContain("12");
    expect(screen.queryByRole("button")).toBeNull();
  });
});

describe("LikeControl visible", () => {
  it("false không render gì", () => {
    const { container } = setup({ visible: false });
    expect(container.innerHTML).toBe("");
  });
});
