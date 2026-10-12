import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import GlobalError from "./global-error";

vi.mock("next/font/google", () => ({
  Inter: () => ({ variable: "font-inter" }),
}));

it("owns the document fallback and retries exactly once without exposing the error", async () => {
  const retry = vi.fn();
  const reset = vi.fn();
  render(<GlobalError error={new Error("private detail")} retry={retry} reset={reset} />);

  expect(document.querySelector("html")?.getAttribute("lang")).toBe("vi");
  expect(screen.queryByText("private detail")).toBeNull();
  await userEvent.setup().click(screen.getByRole("button", { name: "Thử lại" }));
  expect(retry).toHaveBeenCalledTimes(1);
  expect(reset).not.toHaveBeenCalled();
});
