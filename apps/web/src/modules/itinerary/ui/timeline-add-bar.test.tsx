import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { TimelineAddBar } from "./timeline-add-bar";

it("dính đáy vùng cuộn gần nhất và chứa nút bên trong", () => {
  render(
    <TimelineAddBar>
      <button type="button">Thêm điểm đến</button>
    </TimelineAddBar>,
  );

  const bar = screen.getByRole("button", { name: "Thêm điểm đến" }).parentElement as HTMLElement;
  expect(bar.className.split(/\s+/)).toEqual(expect.arrayContaining(["sticky", "bottom-0", "border-t"]));
});

it("không có nút bên trong thì thanh trống để `empty:hidden` ẩn đi", () => {
  const { container } = render(<TimelineAddBar>{null}</TimelineAddBar>);

  expect(container.firstElementChild?.innerHTML).toBe("");
  expect(container.firstElementChild?.className.split(/\s+/)).toContain("empty:hidden");
});
