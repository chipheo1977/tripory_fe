import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import ErrorPage from "./error";

it("retries the public segment exactly once without resetting or exposing the error", async () => {
  const retry = vi.fn();
  const reset = vi.fn();
  render(<ErrorPage error={new Error("private detail")} retry={retry} reset={reset} />);

  expect(screen.queryByText("private detail")).toBeNull();
  await userEvent.setup().click(screen.getByRole("button", { name: "Thử lại" }));
  expect(retry).toHaveBeenCalledTimes(1);
  expect(reset).not.toHaveBeenCalled();
});
