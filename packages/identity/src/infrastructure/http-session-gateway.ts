import type { HttpClient } from '@tripory/api-client';
import type { ProfileReader, SessionGateway } from '../application';
import type { Viewer } from '../domain';
import { userProfileDto, viewerResponseDto } from './dto';
import { toViewer } from './mappers';

// Adapter HTTP cho hai port của identity. Không giữ state toàn cục: mọi thứ đi qua `HttpClient` được tiêm.
//
// Gateway nhận client `/api/auth` (composition đã bọc `withSessionRefresh`). Với login, register, logout, cờ
// `sessionRefresh` tắt vì 401 ở đó không có nghĩa là phiên hết hạn: bật lên sẽ refresh lặp rồi vòng lại
// (T-03-13). Riêng đổi mật khẩu để mặc định: route trả 401 `session.expired` khi access token đã stale, và
// client cần refresh rồi phát lại thay vì để người dùng thấy lỗi.
//
// Body gửi đi chỉ chép đúng các trường hợp đồng cần, để trường thừa của form (ô nhập lại mật khẩu) không
// bao giờ ra khỏi trình duyệt.

/** Bóc `{ viewer }` của route FE. Sai hình dạng hoặc id hỏng thì ném lỗi, không trả `Viewer` hỏng (T-03-10). */
const toSessionViewer = (data: unknown): Viewer => toViewer(viewerResponseDto.parse(data).viewer);

export function createHttpSessionGateway(http: HttpClient): SessionGateway {
  return {
    async login({ email, password }) {
      const data = await http.send({ method: 'POST', path: '/login', body: { email, password }, sessionRefresh: false });

      return toSessionViewer(data);
    },

    async register({ email, password, fullName }) {
      const data = await http.send({
        method: 'POST',
        path: '/register',
        body: { email, password, fullName },
        sessionRefresh: false,
      });

      return toSessionViewer(data);
    },

    async logout() {
      await http.send({ method: 'POST', path: '/logout', sessionRefresh: false });
    },

    async changePassword({ currentPassword, newPassword }) {
      await http.send({ method: 'PUT', path: '/change-password', body: { currentPassword, newPassword } });
    },
  };
}

/**
 * Đọc hồ sơ người đang đăng nhập qua client BFF (`/api/bff`, đã bọc refresh nên không tắt cờ ở đây).
 * Avatar mặc định chung của BE được chuẩn hóa thành `null`.
 */
export function createHttpProfileReader(http: HttpClient): ProfileReader {
  return {
    async me() {
      const data = await http.send({ method: 'GET', path: '/users/me' });

      return toViewer(userProfileDto.parse(data));
    },
  };
}
