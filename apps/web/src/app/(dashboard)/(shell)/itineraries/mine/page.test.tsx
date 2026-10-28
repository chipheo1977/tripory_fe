import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import MinePage from "./page";

it("renders the locked neutral empty state without a fake action", () => {
  render(<MinePage />);

  expect(screen.getByRole("heading", { level: 2, name: "Chưa có nội dung" })).toBeTruthy();
  expect(screen.getByText("Nội dung sẽ xuất hiện tại đây khi sẵn sàng.")).toBeTruthy();
  expect(screen.queryByRole("link")).toBeNull();
  expect(screen.queryByRole("button")).toBeNull();
});
