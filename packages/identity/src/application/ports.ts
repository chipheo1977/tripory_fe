import type { Viewer } from '../domain';

// Hợp đồng giữa application và adapter. Chỉ có type: cài đặt HTTP nằm ở `infrastructure` (subpath `./http`),
// composition của app lắp vào. Không có use case chuyển tiếp, hook React gọi thẳng port (kiến trúc mục 6).

export type LoginInput = Readonly<{ email: string; password: string }>;

export type RegisterInput = LoginInput & Readonly<{ fullName: string }>;

export type ChangePasswordInput = Readonly<{ currentPassword: string; newPassword: string }>;

/**
 * Các lệnh làm thay đổi phiên. Token không bao giờ về tới đây: server đặt cookie httpOnly, các lệnh chỉ
 * trả `Viewer` (đăng nhập, đăng ký) hoặc không trả gì.
 */
export type SessionGateway = Readonly<{
  login(input: LoginInput): Promise<Viewer>;
  /** BE trả token ngay khi đăng ký (D-02), nên đăng ký xong là đã có phiên. */
  register(input: RegisterInput): Promise<Viewer>;
  logout(): Promise<void>;
  /** BE thu hồi mọi refresh token; phiên hiện tại cũng kết thúc (D-18). */
  changePassword(input: ChangePasswordInput): Promise<void>;
}>;

/** Đọc thông tin người đang đăng nhập (avatar không có trong token nên phải hỏi `users/me`). */
export type ProfileReader = Readonly<{ me(): Promise<Viewer> }>;
