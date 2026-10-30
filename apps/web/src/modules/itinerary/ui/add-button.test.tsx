import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { afterEach, expect, it, vi } from "vitest";
import { AddButton } from "./add-button";

afterEach(cleanup);

it.each(["Tạo lịch trình", "Thêm điểm đến"])("nút có tên truy cập là nhãn %s", (label) => {
  render(<AddButton label={label} />);
  expect(screen.getByRole("button", { name: label })).toBeTruthy();
});

it("hiện icon Plus là svg aria-hidden", () => {
  render(<AddButton label="Thêm điểm đến" />);
  const svg = screen.getByRole("button").querySelector("svg");
  expect(svg).not.toBeNull();
  expect(svg?.getAttribute("aria-hidden")).toBe("true");
});

it("gọi onClick đúng một lần khi bấm", async () => {
  const onClick = vi.fn();
  render(<AddButton label="Tạo lịch trình" onClick={onClick} />);
  await userEvent.setup().click(screen.getByRole("button", { name: "Tạo lịch trình" }));
  expect(onClick).toHaveBeenCalledTimes(1);
});

it("visible=false không render gì", () => {
  const { container } = render(<AddButton label="Tạo lịch trình" visible={false} />);
  expect(container.innerHTML).toBe("");
});

it("ref trỏ tới phần tử button", () => {
  const ref = createRef<HTMLButtonElement>();
  render(<AddButton label="Tạo lịch trình" ref={ref} />);
  expect(ref.current).toBe(screen.getByRole("button", { name: "Tạo lịch trình" }));
});

it("chuyển tiếp variant, size, className", () => {
  render(<AddButton className="w-full" label="Thêm ngày" size="sm" variant="ghost" />);
  const button = screen.getByRole("button", { name: "Thêm ngày" });
  expect(button.className).toContain("w-full");
  expect(button.className).toContain("h-control-sm");
  expect(button.className).toContain("bg-transparent");
});

it("variant mặc định là primary", () => {
  render(<AddButton label="Tạo lịch trình" />);
  expect(screen.getByRole("button").className).toContain("bg-primary");
});

it("chuyển tiếp disabled và không gọi onClick", async () => {
  const onClick = vi.fn();
  render(<AddButton disabled label="Tạo lịch trình" onClick={onClick} />);
  const button = screen.getByRole("button", { name: "Tạo lịch trình" });
  expect(button.hasAttribute("disabled") || button.getAttribute("aria-disabled") === "true").toBe(true);
  await userEvent.setup().click(button);
  expect(onClick).not.toHaveBeenCalled();
});
