import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import ErrorPage from "./error";
import Loading from "./loading";

describe("loading", () => {
  it("shows the logo, the loading status and a placeholder instead of a sign-in button", () => {
    const { container } = render(<Loading />);

    expect(screen.getByRole("link", { name: "Tripory" })).toBeTruthy();
    expect(screen.getByRole("status").textContent).toBe("Đang tải lịch trình…");
    expect(screen.queryByRole("link", { name: /đăng nhập/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /đăng nhập/i })).toBeNull();
    expect(container.querySelector("[data-variant=circle]")).not.toBeNull();
  });
});

describe("error", () => {
  it("shows the locked copy and retries through the Next retry callback", async () => {
    const retry = vi.fn();
    render(<ErrorPage error={new Error("x")} reset={vi.fn()} retry={retry} />);

    expect(screen.getByRole("heading", { name: "Không tải được lịch trình" })).toBeTruthy();
    await userEvent.setup().click(screen.getByRole("button", { name: "Thử lại" }));

    expect(retry).toHaveBeenCalledTimes(1);
  });
});
