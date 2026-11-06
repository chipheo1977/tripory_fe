import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { TimelineAddBar, TimelineHiddenBottomProvider } from "./timeline-add-bar";

const bar = () => screen.getByRole("button", { name: "Thêm điểm đến" }).parentElement as HTMLElement;

it("ngoài Sheet (không có provider): dính đáy `bottom: 0`", () => {
  render(
    <TimelineAddBar>
      <button type="button">Thêm điểm đến</button>
    </TimelineAddBar>,
  );

  expect(bar().style.bottom).toBe("0px");
});

it("trong Sheet bị dịch xuống: nâng `bottom` đúng phần đáy popup bị che (trừ đệm đáy của popup)", () => {
  render(
    <TimelineHiddenBottomProvider value={270}>
      <TimelineAddBar>
        <button type="button">Thêm điểm đến</button>
      </TimelineAddBar>
    </TimelineHiddenBottomProvider>,
  );

  expect(bar().style.bottom).toContain("270px");
});

it("không có nút bên trong thì thanh trống để `empty:hidden` ẩn đi", () => {
  const { container } = render(
    <TimelineHiddenBottomProvider value={270}>
      <TimelineAddBar>{null}</TimelineAddBar>
    </TimelineHiddenBottomProvider>,
  );

  expect(container.firstElementChild?.innerHTML).toBe("");
});
