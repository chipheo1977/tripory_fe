import { makeApiError, sessionExpiredError } from "@tripory/api-client";
import { describe, expect, it } from "vitest";
import { ERROR_MESSAGES, GENERIC_ERROR_MESSAGE, SESSION_EXPIRED_MESSAGE } from "./error-messages";
import { selectErrorMessage } from "./select-error-message";

const httpError = (code: string | null, message: string | null, status = 400) =>
  makeApiError({ kind: "http", status, code, message });

const EXPECTED = [
  ["Auth.Unauthorized", "Vui lòng đăng nhập để tiếp tục."],
  ["Auth.InvalidCredentials", "Email hoặc mật khẩu không đúng."],
  ["Auth.InvalidCurrentPassword", "Mật khẩu hiện tại không đúng."],
  ["User.NotFound", "Không tìm thấy người dùng."],
  ["User.EmailAlreadyExists", "Email này đã được đăng ký."],
  ["User.InvalidFullName", "Họ và tên không được để trống."],
  ["User.InvalidPassword", GENERIC_ERROR_MESSAGE],
  ["Email.Empty", "Vui lòng nhập email."],
  ["Email.InvalidFormat", "Email không đúng định dạng."],
  ["Token.InvalidAccessToken", SESSION_EXPIRED_MESSAGE],
  ["Token.InvalidRefreshToken", SESSION_EXPIRED_MESSAGE],
  ["Token.Invalid", SESSION_EXPIRED_MESSAGE],
  ["Token.Expired", SESSION_EXPIRED_MESSAGE],
  ["session.expired", SESSION_EXPIRED_MESSAGE],
  ["Token.Compromised", "Phiên đăng nhập không còn an toàn. Vui lòng đăng nhập lại."],
  ["Token.UserUnavailable", "Tài khoản không tồn tại hoặc đã bị khóa."],
  ["Itinerary.NotFound", "Không tìm thấy lịch trình."],
  ["Itinerary.Forbidden", "Bạn không có quyền chỉnh sửa lịch trình này."],
  ["Itinerary.CannotPublishEmpty", "Cần ít nhất một điểm dừng để xuất bản lịch trình."],
  ["Itinerary.InvalidReorderList", "Danh sách điểm dừng đã thay đổi. Vui lòng tải lại rồi thử lại."],
  ["Itinerary.InvalidDayNumber", "Ngày không hợp lệ."],
  ["Itinerary.InvalidUserId", GENERIC_ERROR_MESSAGE],
  ["ItineraryTitle.Empty", "Tiêu đề không được để trống."],
  ["WaypointName.Empty", "Tên điểm dừng không được để trống."],
  ["Waypoint.NotFound", "Không tìm thấy điểm dừng."],
  ["Coordinate.InvalidLatitude", "Vĩ độ phải nằm trong khoảng -90 đến 90."],
  ["Coordinate.InvalidLongitude", "Kinh độ phải nằm trong khoảng -180 đến 180."],
  ["Conversation.NotFound", "Không tìm thấy cuộc trò chuyện."],
  ["Chat.Forbidden", "Bạn không thuộc cuộc trò chuyện này."],
  ["Conversation.SelfChat", "Bạn không thể nhắn tin cho chính mình."],
  ["Conversation.SelfChatNotAllowed", "Bạn không thể nhắn tin cho chính mình."],
  ["Conversation.InvalidUser", GENERIC_ERROR_MESSAGE],
  ["ChatMessage.EmptyContent", "Nội dung tin nhắn không được để trống."],
  ["ChatMessage.InvalidVoiceUrl", GENERIC_ERROR_MESSAGE],
  ["ChatMessage.NullCallLogData", GENERIC_ERROR_MESSAGE],
  ["File.Empty", "Chưa có tệp ghi âm."],
  ["File.InvalidFormat", "Định dạng ghi âm không được hỗ trợ."],
  ["Server.Error", GENERIC_ERROR_MESSAGE],
  ["Error.NullValue", GENERIC_ERROR_MESSAGE],
] as const;

const UNMAPPED = [
  "Auth.UserBanned",
  "User.BioTooLong",
  "Email.TooLong",
  "Handle.Empty",
  "Handle.InvalidFormat",
  "ItineraryTitle.TooLong",
  "ItineraryDescription.TooLong",
  "WaypointName.TooLong",
  "ChatMessage.ContentTooLong",
  "ChatMessage.InvalidVoiceDuration",
  "File.TooLarge",
  "RateLimit.TooManyRequests",
  "Validation.Error",
  "NotEmptyValidator",
  "MaximumLengthValidator",
  "NotFound",
  "Conflict",
  "BadRequest",
] as const;

describe("ERROR_MESSAGES", () => {
  it("có đúng 39 mã (D-16)", () => {
    expect(ERROR_MESSAGES.size).toBe(39);
    expect(EXPECTED).toHaveLength(39);
  });

  it.each(EXPECTED)("%s → %s", (code, message) => {
    expect(ERROR_MESSAGES.get(code)).toBe(message);
  });

  it.each(UNMAPPED)("%s không có trong bảng (dùng message BE)", (code) => {
    expect(ERROR_MESSAGES.has(code)).toBe(false);
  });
});

describe("selectErrorMessage", () => {
  it("map errorCode thắng message BE", () => {
    expect(selectErrorMessage(httpError("Itinerary.NotFound", "BE nói khác", 404))).toBe("Không tìm thấy lịch trình.");
  });

  it.each([
    ["NotEmptyValidator", "Mật khẩu phải chứa ít nhất một chữ hoa."],
    ["Auth.UserBanned", "Tài khoản bị khóa vì vi phạm."],
  ] as const)("mã %s không map → message BE", (code, message) => {
    expect(selectErrorMessage(httpError(code, message))).toBe(message);
  });

  // D-35: BE giới hạn tốc độ login/register theo IP. Không map riêng (không chép luật của BE); hiện nguyên
  // câu tiếng Việt của BE.
  it("RateLimit.TooManyRequests 429 → message tiếng Việt của BE", () => {
    expect(
      selectErrorMessage(
        httpError("RateLimit.TooManyRequests", "Bạn thao tác quá nhanh. Vui lòng thử lại sau.", 429),
      ),
    ).toBe("Bạn thao tác quá nhanh. Vui lòng thử lại sau.");
  });

  it("mã nội bộ Server.Error kèm message BE → câu chung", () => {
    expect(selectErrorMessage(httpError("Server.Error", "Lỗi máy chủ nội bộ", 500))).toBe(GENERIC_ERROR_MESSAGE);
  });

  it.each([
    ["network", makeApiError({ kind: "network", status: null, code: null, message: null })],
    ["timeout", makeApiError({ kind: "timeout", status: null, code: null, message: null })],
    ["parse", makeApiError({ kind: "parse", status: 200, code: null, message: null })],
    ["http 401 rỗng", httpError(null, null, 401)],
    ["http 404 rỗng", httpError(null, null, 404)],
    ["http 500 rỗng", httpError(null, null, 500)],
    [
      "ValidationProblemDetails",
      makeApiError({
        kind: "http",
        status: 400,
        code: null,
        message: null,
        fieldErrors: { email: ["The Email field is required."] },
      }),
    ],
    ["Error thường", new Error("x")],
    ["null", null],
    ["chuỗi", "chuỗi"],
  ] as const)("%s → câu chung", (_name, error) => {
    expect(selectErrorMessage(error)).toBe(GENERIC_ERROR_MESSAGE);
  });

  it("aborted → null (không hiện gì)", () => {
    expect(selectErrorMessage(makeApiError({ kind: "aborted", status: null, code: null, message: null }))).toBeNull();
  });

  it.each(["toString", "__proto__", "constructor", "hasOwnProperty"] as const)(
    "code %s không khớp nhầm prototype",
    (code) => {
      expect(selectErrorMessage(httpError(code, null))).toBe(GENERIC_ERROR_MESSAGE);
    },
  );

  it("sessionExpiredError → câu hết phiên", () => {
    expect(selectErrorMessage(sessionExpiredError())).toBe("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
  });
});
