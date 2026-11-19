import type { ItineraryId } from '@tripory/shared-kernel';
import { checkCommentContent } from '../domain';
import type { Comment } from '../domain';
import type { SocialRepository } from './ports';
export type SubmitCommentResult =
  | Readonly<{ ok: true; comment: Comment }>
  | Readonly<{ ok: false; reason: 'empty' | 'too-long' }>;
// kiểm luật nội dung trước, sai thì không gọi mạng; gửi bản đã trim (D-10).
// chỉ gửi bình luận có luật nên chỉ có use case này; like và đọc bình luận hook gọi thẳng repository.
export const makeSubmitComment =
  (repo: Pick<SocialRepository, 'addComment'>) =>
  async (id: ItineraryId, raw: string): Promise<SubmitCommentResult> => {
    const check = checkCommentContent(raw);
    if (!check.ok) return check;
    const comment = await repo.addComment(id, check.content);
    return Object.freeze({ ok: true, comment });
  };
