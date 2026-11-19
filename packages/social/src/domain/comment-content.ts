import { COMMENT_MAX_LENGTH } from './comment';
// luật nội dung bình luận (D-10). FE chỉ chặn sớm để khỏi gọi mạng; BE vẫn là nơi cưỡng chế.
export type CommentContentCheck =
  | Readonly<{ ok: true; content: string }>
  | Readonly<{ ok: false; reason: 'empty' | 'too-long' }>;
// khoảng trắng hai đầu không tính, xuống dòng giữa chữ được giữ.
export const trimmedLength = (raw: string): number => raw.trim().length;
export const checkCommentContent = (raw: string): CommentContentCheck => {
  const content = raw.trim();
  if (content.length === 0) return Object.freeze({ ok: false, reason: 'empty' });
  if (content.length > COMMENT_MAX_LENGTH) return Object.freeze({ ok: false, reason: 'too-long' });
  return Object.freeze({ ok: true, content });
};
