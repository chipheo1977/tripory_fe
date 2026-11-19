import type { Comment, CommentPage } from './comment';
import type { CommentId } from './ids';
// thao tác thuần trên danh sách trang bình luận đã tải (RESEARCH R4).
// gộp các trang theo thứ tự, bỏ trùng theo id (lần xuất hiện đầu thắng): comment mới chèn đầu
// làm phần tử dịch xuống nên trang sau có thể lặp lại phần tử của trang trước.
export const mergeCommentPages = (pages: readonly CommentPage[]): readonly Comment[] => {
  const seen = new Set<CommentId>();
  const result: Comment[] = [];
  for (const page of pages) {
    for (const item of page.items) {
      if (seen.has(item.id)) continue;
      seen.add(item.id);
      result.push(item);
    }
  }
  return Object.freeze(result);
};
// trang kế tính theo số phần tử đã tải, không theo `pageIndex + 1`, để không sót phần tử khi đã chèn hoặc xóa.
export const nextCommentPageIndex = (loadedCount: number, pageSize: number): number =>
  Math.floor(loadedCount / pageSize) + 1;
const withItems = (page: CommentPage, items: readonly Comment[], totalCount: number): CommentPage =>
  Object.freeze({ ...page, items: Object.freeze([...items]), totalCount });
// chèn comment vừa gửi lên đầu trang đầu; id đã có thì chuyển lên đầu và không đổi `totalCount`.
export const prependCommentToPages = (pages: readonly CommentPage[], comment: Comment): readonly CommentPage[] => {
  const [first, ...rest] = pages;
  if (first === undefined) return pages;
  const existed = pages.some((page) => page.items.some((item) => item.id === comment.id));
  const delta = existed ? 0 : 1;
  const strip = (page: CommentPage) => page.items.filter((item) => item.id !== comment.id);
  const head = withItems(first, [comment, ...strip(first)], first.totalCount + delta);
  const tail = rest.map((page) => withItems(page, strip(page), page.totalCount + delta));
  return Object.freeze([head, ...tail]);
};
// bỏ comment khỏi mọi trang; `totalCount` giảm 1 (không dưới 0) chỉ khi thực sự có xóa.
export const removeCommentFromPages = (pages: readonly CommentPage[], commentId: CommentId): readonly CommentPage[] => {
  const found = pages.some((page) => page.items.some((item) => item.id === commentId));
  if (!found) return pages;
  return Object.freeze(
    pages.map((page) =>
      withItems(
        page,
        page.items.filter((item) => item.id !== commentId),
        Math.max(0, page.totalCount - 1),
      ),
    ),
  );
};
