import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { PublicLoadError, PublicRefreshError } from "./public-load-error";

const h = vi.hoisted(() => ({ refresh: vi.fn() }));

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: h.refresh }) }));

describe("PublicLoadError", () => {
  it("shows the locked copy and retries once per click", async () => {
    const onRetry = vi.fn();
    render(<PublicLoadError onRetry={onRetry} />);

    expect(screen.getByRole("heading", { name: "Không tải được lịch trình" })).toBeTruthy();
    expect(screen.getByText("Đã xảy ra sự cố khi tải lịch trình. Kiểm tra kết nối mạng rồi thử lại.")).toBeTruthy();
    await userEvent.setup().click(screen.getByRole("button", { name: "Thử lại" }));

    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});

describe("PublicRefreshError", () => {
  it("refreshes the route data on retry", async () => {
    h.refresh.mockReset();
    render(<PublicRefreshError />);

    await userEvent.setup().click(screen.getByRole("button", { name: "Thử lại" }));

    expect(h.refresh).toHaveBeenCalledTimes(1);
  });
});
