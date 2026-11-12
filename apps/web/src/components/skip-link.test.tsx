import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { SkipLink } from "./skip-link";

it("is a link to the given target that is visually hidden until focused", () => {
  render(<SkipLink href="#x" />);

  const link = screen.getByRole("link", { name: "Bỏ qua đến nội dung chính" });
  expect(link.getAttribute("href")).toBe("#x");
  expect(link.className).toContain("sr-only");
  expect(link.className).toContain("focus:not-sr-only");
});
