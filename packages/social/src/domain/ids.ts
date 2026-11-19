import { isGuid } from '@tripory/shared-kernel';
import type { Brand } from '@tripory/shared-kernel';
// id bình luận chỉ context social dùng nên ở lại đây, không đưa vào kernel (kiến trúc mục 9).
export type CommentId = Brand<string, 'CommentId'>;
// chuẩn hóa chữ thường như id của kernel để so sánh `===` không sai vì hoa thường.
// chuỗi sai trả `null`: id đi vào đường dẫn gọi BE nên chỉ GUID mới được qua.
export const parseCommentId = (value: string): CommentId | null => {
  const trimmed = value.trim();
  return isGuid(trimmed) ? (trimmed.toLowerCase() as CommentId) : null;
};
