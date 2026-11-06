// Chỉ map khi FE viết được câu tốt hơn mà không phải chép luật của BE. Mã có giới hạn động
// (`{MaxLength}`, lý do khóa tài khoản...) và mã mang tên validator (`*Validator`,
// `Validation.Error`) cố ý KHÔNG có key ở đây để dùng nguyên message BE. Mã lỗi nội bộ map về
// câu chung để không lộ chi tiết kỹ thuật.
//
// Tra bằng `Map` thay vì object literal để `toString`, `__proto__`, `constructor`... không khớp
// nhầm key prototype. Bảng song song cho người đọc ở `tripory/docs/common/MESSAGE_LIST.md` §3.
import { SESSION_EXPIRED } from "@tripory/api-client";

/** D-04: câu chung, cố ý không có dấu chấm cuối. */
export const GENERIC_ERROR_MESSAGE = "Đã có lỗi xảy ra, vui lòng thử lại";
/** D-05a: hiện ở ô form khi BE trả ValidationProblemDetails (message gốc là tiếng Anh). */
export const FIELD_INVALID_MESSAGE = "Giá trị không hợp lệ.";
export const SESSION_EXPIRED_MESSAGE = "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.";
/**
 * D-20: khác dấu câu với `SESSION_EXPIRED_MESSAGE` có chủ đích (một câu liền, không dấu chấm giữa câu).
 * Dùng cho toast hết phiên; giữ hằng cũ cho bảng map lỗi.
 */
export const SESSION_EXPIRED_TOAST = "Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại";

export const ERROR_MESSAGES: ReadonlyMap<string, string> = new Map<string, string>([
  // Auth / User
  ["Auth.Unauthorized", "Vui lòng đăng nhập để tiếp tục."],
  ["Auth.InvalidCredentials", "Email hoặc mật khẩu không đúng."],
  ["Auth.InvalidCurrentPassword", "Mật khẩu hiện tại không đúng."],
  ["User.NotFound", "Không tìm thấy người dùng."],
  ["User.EmailAlreadyExists", "Email này đã được đăng ký."],
  ["User.InvalidFullName", "Họ và tên không được để trống."],
  ["User.InvalidPassword", GENERIC_ERROR_MESSAGE],
  ["Email.Empty", "Vui lòng nhập email."],
  ["Email.InvalidFormat", "Email không đúng định dạng."],
  // Token / phiên
  ["Token.InvalidAccessToken", SESSION_EXPIRED_MESSAGE],
  ["Token.InvalidRefreshToken", SESSION_EXPIRED_MESSAGE],
  ["Token.Invalid", SESSION_EXPIRED_MESSAGE],
  ["Token.Expired", SESSION_EXPIRED_MESSAGE],
  [SESSION_EXPIRED, SESSION_EXPIRED_MESSAGE],
  ["Token.Compromised", "Phiên đăng nhập không còn an toàn. Vui lòng đăng nhập lại."],
  ["Token.UserUnavailable", "Tài khoản không tồn tại hoặc đã bị khóa."],
  // Itinerary / Waypoint
  ["Itinerary.NotFound", "Không tìm thấy lịch trình."],
  ["Itinerary.Forbidden", "Bạn không có quyền sửa lịch trình này."],
  ["Itinerary.CannotPublishEmpty", "Thêm ít nhất 1 điểm đến để xuất bản."],
  // D-37: reorder tự xử lý bằng toast info, câu này chỉ là dự phòng.
  ["Itinerary.InvalidReorderList", "Danh sách đã thay đổi, đã tải lại"],
  ["Itinerary.InvalidDayNumber", "Ngày không hợp lệ."],
  ["Itinerary.InvalidUserId", GENERIC_ERROR_MESSAGE],
  ["ItineraryTitle.Empty", "Vui lòng nhập tiêu đề."],
  // Form tạo lịch trình và ảnh bìa (04-BE-CONTRACT.md mục 9). Không mã nào chứa NotFound/Conflict/Forbidden...
  ["Itinerary.DestinationRequired", "Vui lòng chọn điểm đến."],
  ["Itinerary.DestinationUnknown", "Điểm đến không hợp lệ. Vui lòng chọn lại."],
  ["Itinerary.DayCountOutOfRange", "Số ngày từ 1 đến 30."],
  ["Itinerary.InterestUnknown", "Có sở thích không hợp lệ. Vui lòng chọn lại."],
  ["Itinerary.InterestDuplicated", "Sở thích bị trùng. Vui lòng chọn lại."],
  ["Itinerary.TooManyInterests", "Chọn tối đa 7 sở thích."],
  ["Itinerary.TooManyCoverImages", "Chỉ lưu được tối đa 5 ảnh bìa."],
  ["Itinerary.CoverImageInvalidUrl", "Link ảnh phải bắt đầu bằng https://."],
  ["Itinerary.CoverImageTooLong", "Link ảnh tối đa 500 ký tự."],
  ["Itinerary.CoverImageDuplicated", "Ảnh này đã có trong danh sách."],
  // Không có câu riêng (UI-SPEC): refetch rồi dùng câu chung.
  ["Itinerary.CoverSelectionInvalid", GENERIC_ERROR_MESSAGE],
  ["WaypointName.Empty", "Vui lòng nhập tên điểm đến."],
  ["Waypoint.NotFound", "Điểm đến không còn tồn tại."],
  // Do FE sinh (route resolve link rút gọn), không phải mã của BE.
  ["Maps.UnresolvableLink", "Không mở được link rút gọn này. Thử dán link đầy đủ hoặc tọa độ."],
  // Do FE sinh (BFF `/api/places/*`, D-153).
  ["Places.RateLimited", "Bạn tìm hơi nhanh. Đợi vài giây rồi thử lại."],
  ["Places.Unavailable", "Chưa tìm được địa điểm lúc này. Thử lại hoặc nhập tọa độ thủ công."],
  ["Bff.InvalidQuery", "Từ khóa tìm kiếm không hợp lệ."],
  ["Coordinate.InvalidLatitude", "Vĩ độ phải nằm trong khoảng -90 đến 90."],
  ["Coordinate.InvalidLongitude", "Kinh độ phải nằm trong khoảng -180 đến 180."],
  // Chat
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
  // Lỗi nội bộ
  ["Server.Error", GENERIC_ERROR_MESSAGE],
  ["Error.NullValue", GENERIC_ERROR_MESSAGE],
]);
