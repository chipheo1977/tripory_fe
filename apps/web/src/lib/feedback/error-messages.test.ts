import { describe, expect, it } from "vitest";
import * as feedback from "./index";
import { ERROR_MESSAGES, SESSION_EXPIRED_MESSAGE, SESSION_EXPIRED_TOAST } from "./error-messages";

describe("SESSION_EXPIRED_TOAST (D-20)", () => {
  it("đúng câu đã khóa, không có dấu chấm", () => {
    expect(SESSION_EXPIRED_TOAST).toBe("Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại");
    expect(SESSION_EXPIRED_TOAST).not.toContain(".");
  });

  it("khác SESSION_EXPIRED_MESSAGE về dấu câu có chủ đích", () => {
    expect(SESSION_EXPIRED_TOAST).not.toBe(SESSION_EXPIRED_MESSAGE);
  });

  it("SESSION_EXPIRED_MESSAGE giữ nguyên giá trị cũ cho bảng map lỗi", () => {
    expect(SESSION_EXPIRED_MESSAGE).toBe("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
    expect(ERROR_MESSAGES.get("Token.Expired")).toBe(SESSION_EXPIRED_MESSAGE);
  });

  it("không thêm khóa vào bảng map", () => {
    expect(ERROR_MESSAGES.size).toBe(39);
  });

  it("đi ra qua barrel lib/feedback", () => {
    expect(feedback.SESSION_EXPIRED_TOAST).toBe(SESSION_EXPIRED_TOAST);
  });
});
