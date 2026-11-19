import { describe, expect, it } from 'vitest';
import { mergeCommentPages, nextCommentPageIndex, prependCommentToPages, removeCommentFromPages } from './comment-feed';
import { commentIdFixture, makeComment, makePage } from './test-fixtures';
const c = (n: number) => makeComment({ n });
const ids = (items: readonly { id: string }[]) => items.map((item) => item.id);
describe('mergeCommentPages', () => {
  it('gộp theo thứ tự trang', () => {
    const merged = mergeCommentPages([makePage([c(1), c(2)]), makePage([c(3)])]);
    expect(ids(merged)).toEqual(ids([c(1), c(2), c(3)]));
  });
  it('bỏ trùng theo id, lần đầu thắng', () => {
    const first = makeComment({ n: 2, content: 'đầu' });
    const merged = mergeCommentPages([makePage([c(1), first]), makePage([makeComment({ n: 2, content: 'sau' }), c(3)])]);
    expect(merged).toHaveLength(3);
    expect(merged[1]?.content).toBe('đầu');
  });
  it('không có trang thì mảng rỗng', () => {
    expect(mergeCommentPages([])).toEqual([]);
  });
  it('trang rỗng thì mảng rỗng', () => {
    expect(mergeCommentPages([makePage([])])).toEqual([]);
  });
});
describe('nextCommentPageIndex', () => {
  it.each([
    [0, 10, 1],
    [9, 10, 1],
    [10, 10, 2],
    [11, 10, 2],
    [19, 10, 2],
    [20, 10, 3],
  ])('(%i, %i) = %i', (loaded, size, expected) => {
    expect(nextCommentPageIndex(loaded, size)).toBe(expected);
  });
});
describe('prependCommentToPages', () => {
  it('chèn lên đầu trang đầu và tăng totalCount mọi trang', () => {
    const pages = [makePage([c(1)], { totalCount: 11 }), makePage([c(2)], { pageIndex: 2, totalCount: 11 })];
    const next = prependCommentToPages(pages, c(9));
    expect(ids(next[0]?.items ?? [])).toEqual(ids([c(9), c(1)]));
    expect(next.map((page) => page.totalCount)).toEqual([12, 12]);
  });
  it('id đã có thì chuyển lên đầu, không đổi totalCount', () => {
    const pages = [makePage([c(1)], { totalCount: 2 }), makePage([c(2)], { pageIndex: 2, totalCount: 2 })];
    const next = prependCommentToPages(pages, c(2));
    expect(ids(next[0]?.items ?? [])).toEqual(ids([c(2), c(1)]));
    expect(next[1]?.items).toEqual([]);
    expect(next.map((page) => page.totalCount)).toEqual([2, 2]);
  });
  it('không có trang thì trả nguyên', () => {
    const pages: never[] = [];
    expect(prependCommentToPages(pages, c(1))).toBe(pages);
  });
});
describe('removeCommentFromPages', () => {
  it('bỏ id khỏi mọi trang và giảm totalCount', () => {
    const pages = [makePage([c(1), c(2)], { totalCount: 3 }), makePage([c(3)], { pageIndex: 2, totalCount: 3 })];
    const next = removeCommentFromPages(pages, commentIdFixture(2));
    expect(ids(next[0]?.items ?? [])).toEqual(ids([c(1)]));
    expect(next.map((page) => page.totalCount)).toEqual([2, 2]);
  });
  it('totalCount không dưới 0', () => {
    const next = removeCommentFromPages([makePage([c(1)], { totalCount: 0 })], commentIdFixture(1));
    expect(next[0]?.totalCount).toBe(0);
  });
  it('id không có thì trả nguyên', () => {
    const pages = [makePage([c(1)], { totalCount: 1 })];
    expect(removeCommentFromPages(pages, commentIdFixture(5))).toBe(pages);
  });
});
