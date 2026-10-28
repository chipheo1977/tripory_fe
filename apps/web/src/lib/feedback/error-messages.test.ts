import { describe, expect, it } from "vitest";
import * as feedback from "./index";
import { ERROR_MESSAGES, SESSION_EXPIRED_MESSAGE, SESSION_EXPIRED_TOAST } from "./error-messages";

describe("mã lỗi itinerary theo copy UI-SPEC Phase 4", () => {
  it.each([
    ["Itinerary.Forbidden", "Bạn không có quyền sửa lịch trình này."],
    ["Itinerary.CannotPublishEmpty", "Thêm ít nhất 1 điểm đến để xuất bản."],
    ["Itinerary.InvalidReorderList", "Danh sách đã thay đổi, đã tải lại"],
    ["ItineraryTitle.Empty", "Vui lòng nhập tiêu đề."],
    ["WaypointName.Empty", "Vui lòng nhập tên điểm đến."],
    ["Waypoint.NotFound", "Điểm đến không còn tồn tại."],
    ["Maps.UnresolvableLink", "Không mở được link rút gọn này. Thử dán link đầy đủ hoặc tọa độ."],
  ])("%s → đúng câu đã chốt", (code, message) => {
    expect(ERROR_MESSAGES.get(code)).toBe(message);
  });

  it("giữ nguyên các mã cũ không đổi", () => {
    expect(ERROR_MESSAGES.get("Itinerary.NotFound")).toBe("Không tìm thấy lịch trình.");
    expect(ERROR_MESSAGES.get("Itinerary.InvalidDayNumber")).toBe("Ngày không hợp lệ.");
    expect(ERROR_MESSAGES.has("Coordinate.InvalidLatitude")).toBe(true);
    expect(ERROR_MESSAGES.has("Coordinate.InvalidLongitude")).toBe(true);
  });

  it("không có mã TooLong (giới hạn động dùng message BE) và không dùng từ 'điểm dừng'", () => {
    for (const [code, message] of ERROR_MESSAGES) {
      expect(code).not.toContain("TooLong");
      expect(message).not.toContain("điểm dừng");
    }
  });
});

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

  it("bảng map có đúng 40 khóa (thêm Maps.UnresolvableLink)", () => {
    expect(ERROR_MESSAGES.size).toBe(40);
  });

  it("đi ra qua barrel lib/feedback", () => {
    expect(feedback.SESSION_EXPIRED_TOAST).toBe(SESSION_EXPIRED_TOAST);
  });
});
