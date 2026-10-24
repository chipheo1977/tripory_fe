import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AuthFormCard } from "./auth-form-card";

const follows = (first: Node, second: Node) =>
  Boolean(first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING);

describe("AuthFormCard", () => {
  it("có đúng một h1 với id titleId và nội dung title", () => {
    render(
      <AuthFormCard title="Đăng nhập" titleId="login-title">
        <p>nội dung</p>
      </AuthFormCard>,
    );

    const headings = screen.getAllByRole("heading", { level: 1 });
    expect(headings).toHaveLength(1);
    expect(headings[0]?.id).toBe("login-title");
    expect(headings[0]?.textContent).toBe("Đăng nhập");
    expect(screen.getAllByRole("heading")).toHaveLength(1);
  });

  it("thứ tự DOM: h1, alert, children, footer", () => {
    render(
      <AuthFormCard
        alert={<div role="alert">Lỗi form</div>}
        footer={<p>Chân trang</p>}
        title="Tạo tài khoản"
        titleId="register-title"
      >
        <form aria-labelledby="register-title">
          <input aria-label="Email" />
        </form>
      </AuthFormCard>,
    );

    const heading = screen.getByRole("heading", { level: 1 });
    const alert = screen.getByRole("alert");
    const input = screen.getByLabelText("Email");
    const footer = screen.getByText("Chân trang");

    expect(follows(heading, alert)).toBe(true);
    expect(follows(alert, input)).toBe(true);
    expect(follows(input, footer)).toBe(true);
  });

  it("alert và footer là tùy chọn; không có alert thì không render vùng role=alert", () => {
    render(
      <AuthFormCard title="Đổi mật khẩu" titleId="change-title">
        <p>chỉ có form</p>
      </AuthFormCard>,
    );

    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.getByText("chỉ có form")).toBeTruthy();
  });

  it("Card padding lg, căn giữa, rộng tối đa max-w-form (D-06)", () => {
    render(
      <AuthFormCard title="Đăng nhập" titleId="login-title">
        <p>nội dung</p>
      </AuthFormCard>,
    );

    const card = screen.getByRole("heading", { level: 1 }).parentElement as HTMLElement;
    expect(card.className).toContain("p-stack-lg");
    expect(card.className).toContain("mx-auto");
    expect(card.className).toContain("w-full");
    expect(card.className).toContain("max-w-form");
  });

  it("h1 dùng typography Display của token", () => {
    render(
      <AuthFormCard title="Đăng nhập" titleId="login-title">
        <p>nội dung</p>
      </AuthFormCard>,
    );

    const className = screen.getByRole("heading", { level: 1 }).className;
    expect(className).toContain("text-display");
    expect(className).toContain("font-semibold");
  });
});
