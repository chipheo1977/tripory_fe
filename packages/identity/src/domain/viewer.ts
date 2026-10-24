import type { UserId } from '@tripory/shared-kernel';

// Người đang đăng nhập, ở dạng domain. Plain object readonly (không class) để đi qua ranh giới server/client
// của Next được. `avatarUrl` là `null` khi người dùng chưa có ảnh riêng (BE trả ảnh mặc định chung cho mọi
// người, ACL ở infrastructure đổi nó thành `null` để UI hiện chữ cái đầu).
export type Viewer = Readonly<{
  id: UserId;
  email: string;
  fullName: string;
  handle: string;
  avatarUrl: string | null;
}>;

/** Tên hiển thị trong menu: họ tên nếu có, không thì email. */
export const viewerDisplayName = (viewer: Viewer): string => {
  const name = viewer.fullName.trim();

  return name === '' ? viewer.email : name;
};
