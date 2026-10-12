import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import HomePage from "./page";

it("renders the minimal Tripory presence without a call to action", () => {
  render(<HomePage />);

  expect(screen.getByRole("heading", { level: 1, name: "Tripory" })).toBeTruthy();
  expect(screen.getByText("Lập và chia sẻ lịch trình du lịch")).toBeTruthy();
  expect(screen.getByText("Đang trong giai đoạn thử nghiệm")).toBeTruthy();
  expect(screen.queryByRole("link")).toBeNull();
  expect(screen.queryByRole("button")).toBeNull();
});
