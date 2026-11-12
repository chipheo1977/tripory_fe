import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PublicForbidden } from "./public-forbidden";
import { PublicHeader } from "./public-header";
import { PublicStatusFrame } from "./public-status-frame";

describe("PublicForbidden", () => {
  it("shows the locked copy and a home link only", () => {
    const { container } = render(<PublicForbidden />);

    expect(screen.getByRole("heading", { name: "Lịch trình này chưa được xuất bản" })).toBeTruthy();
    expect(screen.getByText("Chỉ người tạo xem được bản nháp.")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Về trang chủ" }).getAttribute("href")).toBe("/");
    expect(container.querySelectorAll("a")).toHaveLength(1);
  });

  it("never invites the visitor to sign in", () => {
    const { container } = render(<PublicForbidden />);

    expect(container.textContent).not.toMatch(/đăng nhập/i);
    expect(screen.queryByRole("link", { name: /đăng nhập/i })).toBeNull();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("renders only the fixed copy (no itinerary data can reach it)", () => {
    const { container } = render(<PublicForbidden />);

    expect(container.textContent).toBe("Lịch trình này chưa được xuất bản" + "Chỉ người tạo xem được bản nháp." + "Về trang chủ");
    expect(PublicForbidden.length).toBe(0);
  });
});

describe("PublicStatusFrame", () => {
  it("has a skip link to the main region, the header before main, and a full-height root", () => {
    const { container } = render(
      <PublicStatusFrame header={<i data-testid="h" />}>
        <p>nội dung</p>
      </PublicStatusFrame>,
    );

    const skip = screen.getByRole("link", { name: "Bỏ qua đến nội dung chính" });
    expect(skip.getAttribute("href")).toBe("#public-content");
    const main = container.querySelector("main#public-content") as HTMLElement;
    expect(main.getAttribute("tabindex")).toBe("-1");
    expect(main.textContent).toBe("nội dung");
    expect(screen.getByTestId("h").compareDocumentPosition(main) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect((container.firstElementChild as HTMLElement).className).toContain("min-h-dvh");
  });

  it("composes with a logo-only header for the 403 page", () => {
    render(
      <PublicStatusFrame header={<PublicHeader />}>
        <PublicForbidden />
      </PublicStatusFrame>,
    );

    expect(screen.getByRole("link", { name: "Tripory" }).getAttribute("href")).toBe("/");
    expect(screen.getByRole("heading", { name: "Lịch trình này chưa được xuất bản" })).toBeTruthy();
  });
});
