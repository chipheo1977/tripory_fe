import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import { MapEditInfoButton } from "./map-edit-info-button";

it("có tên truy cập và tooltip 'Sửa thông tin', cỡ 32px như nút zoom, icon không đọc", () => {
  render(<MapEditInfoButton onClick={() => undefined} visible />);

  const button = screen.getByRole("button", { name: "Sửa thông tin" });
  expect(button.getAttribute("title")).toBe("Sửa thông tin");
  expect(button.className.split(/\s+/)).toEqual(expect.arrayContaining(["h-control-sm", "w-control-sm", "min-h-touch", "min-w-touch"]));
  expect(button.querySelector("svg")?.getAttribute("aria-hidden")).toBe("true");
});

it("bấm chuột, Enter và Space đều gọi onClick", async () => {
  const onClick = vi.fn();
  const user = userEvent.setup();
  render(<MapEditInfoButton onClick={onClick} visible />);
  const button = screen.getByRole("button", { name: "Sửa thông tin" });

  await user.click(button);
  button.focus();
  await user.keyboard("{Enter}");
  await user.keyboard(" ");

  expect(onClick).toHaveBeenCalledTimes(3);
});

it("visible=false không render gì", () => {
  const { container } = render(<MapEditInfoButton onClick={() => undefined} visible={false} />);

  expect(container.firstChild).toBeNull();
});
