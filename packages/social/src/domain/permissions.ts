import type { UserId } from '@tripory/shared-kernel';
// chỉ để ẩn/hiện nút xóa trên UI (D-12). BE vẫn chặn người không có quyền bằng 403.
// mọi id đều đi qua `parseUserId` (chữ thường) nên so `===` không sai vì hoa thường.
// tác giả null (người dùng không còn) thì chỉ chủ lịch trình xóa được.
export const canDeleteComment = (viewerId: UserId | null, authorId: UserId | null, ownerId: UserId): boolean =>
  viewerId !== null && (viewerId === authorId || viewerId === ownerId);
