import { z } from 'zod';
// ACL: hình dạng JSON của BE sau khi BFF bóc envelope (05.1-BE-CONTRACT.md §5); Zod bỏ khóa lạ nên email
// hay trường thừa không lọt sang domain.

/** `LikeStateDto`: phản hồi của GET/PUT/DELETE `.../like`. */
export const likeStateDto = z.object({
  likeCount: z.number().int().nonnegative(),
  likedByMe: z.boolean(),
});

/** `CommentAuthorDto`: cùng kiểu với `author` của chi tiết lịch trình, không email. */
export const commentAuthorDto = z.object({
  id: z.string(),
  displayName: z.string(),
  avatarUrl: z.string().nullish(),
});

/** `CommentDto`: phần tử của GET `.../comments`, phản hồi của POST `.../comments`. */
export const commentDto = z.object({
  id: z.string(),
  content: z.string(),
  createdAt: z.iso.datetime({ offset: true }),
  author: commentAuthorDto.nullish(),
});

/** `PagedResult<CommentDto>`: chỉ giữ các trường FE dùng. */
export const commentPageDto = z.object({
  items: z.array(commentDto),
  pageIndex: z.number().int(),
  pageSize: z.number().int(),
  totalCount: z.number().int(),
  hasNextPage: z.boolean(),
});

export type LikeStateDto = z.infer<typeof likeStateDto>;
export type CommentAuthorDto = z.infer<typeof commentAuthorDto>;
export type CommentDto = z.infer<typeof commentDto>;
export type CommentPageDto = z.infer<typeof commentPageDto>;
