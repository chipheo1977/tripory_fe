import { CHANGE_PASSWORD_RULES, REGISTER_PASSWORD_RULES, evaluatePasswordRules } from "@tripory/identity";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PasswordChecklist } from "./password-checklist";
import { buildChecklistItems } from "./password-rule-copy";

const changeItems = (password: string, current = "") =>
  buildChecklistItems(evaluatePasswordRules(CHANGE_PASSWORD_RULES, password, current));

describe("PasswordChecklist", () => {
  it("hiện tiêu đề và đủ 6 mục của đổi mật khẩu ngay lúc chưa nhập gì (AUTH-06)", () => {
    render(<PasswordChecklist id="new-password-rules" items={changeItems("")} />);

    expect(screen.getByText("Mật khẩu cần có:")).toBeTruthy();
    const rows = screen.getAllByRole("listitem");
    expect(rows).toHaveLength(6);
    expect(rows.map((row) => row.textContent)).toEqual([
      "Chưa đạt: Ít nhất 8 ký tự",
      "Chưa đạt: Có chữ in hoa (A–Z)",
      "Chưa đạt: Có chữ thường (a–z)",
      "Chưa đạt: Có chữ số (0–9)",
      "Chưa đạt: Có một trong các ký tự ! ? * @ # $ % ^ & + =",
      "Chưa đạt: Khác mật khẩu hiện tại",
    ]);
  });

  it("checklist đăng ký chỉ có một mục minLength (D-27)", () => {
    const items = buildChecklistItems(evaluatePasswordRules(REGISTER_PASSWORD_RULES, ""));
    render(<PasswordChecklist id="register-rules" items={items} />);

    expect(screen.getAllByRole("listitem").map((row) => row.textContent)).toEqual(["Chưa đạt: Ít nhất 8 ký tự"]);
  });

  it("danh sách có aria-live=polite (D-26)", () => {
    render(<PasswordChecklist id="rules" items={changeItems("")} />);

    expect(screen.getByRole("list").getAttribute("aria-live")).toBe("polite");
  });

  it("id đặt trên container để ô mật khẩu trỏ aria-describedby", () => {
    render(<PasswordChecklist id="new-password-rules" items={changeItems("")} />);

    const container = document.getElementById("new-password-rules");
    expect(container).not.toBeNull();
    expect(container?.contains(screen.getByRole("list"))).toBe(true);
    expect(container?.contains(screen.getByText("Mật khẩu cần có:"))).toBe(true);
  });

  it("icon trang trí (aria-hidden), màu trạng thái chưa đạt là text-muted", () => {
    render(<PasswordChecklist id="rules" items={changeItems("")} />);

    for (const row of screen.getAllByRole("listitem")) {
      const icon = row.querySelector("svg");
      expect(icon?.getAttribute("aria-hidden")).toBe("true");
      expect(icon?.classList.contains("text-muted")).toBe(true);
      expect(icon?.classList.contains("text-success")).toBe(false);
    }
  });

  it("mục đạt đổi tiền tố 'Đã đạt: ' và icon sang CircleCheck text-success", () => {
    render(<PasswordChecklist id="rules" items={changeItems("Abcdef1!", "Old12345!")} />);

    for (const row of screen.getAllByRole("listitem")) {
      expect(row.textContent?.startsWith("Đã đạt: ")).toBe(true);
      const icon = row.querySelector("svg");
      expect(icon?.classList.contains("text-success")).toBe(true);
      expect(icon?.classList.contains("text-muted")).toBe(false);
      expect(icon?.classList.contains("lucide-circle-check")).toBe(true);
    }
  });

  it("chỉ mục đạt đổi trạng thái, mục còn lại giữ nguyên", () => {
    render(<PasswordChecklist id="rules" items={changeItems("abcdefgh", "Old12345!")} />);

    const byLabel = new Map(screen.getAllByRole("listitem").map((row) => [row.textContent, row]));
    expect(byLabel.has("Đã đạt: Ít nhất 8 ký tự")).toBe(true);
    expect(byLabel.has("Chưa đạt: Có chữ in hoa (A–Z)")).toBe(true);
    expect(byLabel.has("Đã đạt: Có chữ thường (a–z)")).toBe(true);
    expect(byLabel.has("Chưa đạt: Có chữ số (0–9)")).toBe(true);
    expect(byLabel.has("Chưa đạt: Có một trong các ký tự ! ? * @ # $ % ^ & + =")).toBe(true);
    expect(byLabel.has("Đã đạt: Khác mật khẩu hiện tại")).toBe(true);
  });

  it("differentFromCurrent: trùng mật khẩu hiện tại thì mục này chưa đạt", () => {
    render(<PasswordChecklist id="rules" items={changeItems("Abcdef1!", "Abcdef1!")} />);

    expect(screen.getByText("Khác mật khẩu hiện tại").closest("li")?.textContent).toBe(
      "Chưa đạt: Khác mật khẩu hiện tại",
    );
  });

  it("cập nhật items giữ nguyên node <li> (key theo id), chỉ đổi nội dung", () => {
    const { rerender } = render(<PasswordChecklist id="rules" items={changeItems("")} />);
    const before = screen.getAllByRole("listitem");

    rerender(<PasswordChecklist id="rules" items={changeItems("Abcdef1!", "Old12345!")} />);
    const after = screen.getAllByRole("listitem");

    expect(after).toHaveLength(6);
    after.forEach((row, index) => {
      expect(row).toBe(before[index]);
      expect(row.textContent?.startsWith("Đã đạt: ")).toBe(true);
    });
  });

  it("tiền tố đọc màn hình là sr-only, không hiện ra mắt", () => {
    render(<PasswordChecklist id="rules" items={changeItems("")} />);

    const prefixes = screen.getAllByText(/^Chưa đạt:/);
    expect(prefixes).toHaveLength(6);
    for (const prefix of prefixes) {
      expect(prefix.classList.contains("sr-only")).toBe(true);
      expect(prefix.textContent).toBe("Chưa đạt: ");
    }
  });
});
