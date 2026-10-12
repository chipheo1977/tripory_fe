import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import Loading from "./loading";

it("announces one dashboard loading state and keeps skeletons decorative", () => {
  const { container } = render(<Loading />);
  expect(screen.getAllByRole("status")).toHaveLength(1);
  expect(screen.getByRole("status").textContent).toBe("Đang tải nội dung…");
  expect(container.querySelectorAll('[aria-hidden="true"]').length).toBeGreaterThan(0);
});
