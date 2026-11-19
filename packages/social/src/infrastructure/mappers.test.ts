import { describe, expect, it } from 'vitest';
import { commentDto, commentPageDto, likeStateDto } from './dto';
import { AUTHOR_ID_FIXTURE, commentJsonFixture, commentPageJsonFixture, likeStateJsonFixture } from './fixtures';
import { toComment, toCommentPage, toLikeState } from './mappers';

const comment = (overrides: Record<string, unknown> = {}) => commentDto.parse({ ...commentJsonFixture, ...overrides });
const withAuthor = (author: Record<string, unknown> | null) => toComment(comment({ author }));

describe('toLikeState', () => {
  it('đổi tên trường và freeze', () => {
    const state = toLikeState(likeStateDto.parse(likeStateJsonFixture));
    expect(state).toEqual({ count: 13, liked: true });
    expect(Object.isFrozen(state)).toBe(true);
  });
});

describe('toComment', () => {
  it.each(['Đẹp quá!\nMình sẽ đi thử.', '<b>x</b>', 'https://a.vn/x?y=1'])('giữ content nguyên văn %j', (content) => {
    expect(toComment(comment({ content })).content).toBe(content);
  });

  it('id hoa thành chữ thường', () => {
    expect(toComment(comment({ id: '7C9E6679-7425-40DE-944B-E07FC1F90AE7' })).id).toBe(
      '7c9e6679-7425-40de-944b-e07fc1f90ae7',
    );
  });

  it('id không phải GUID thì ném', () => {
    expect(() => toComment(comment({ id: 'khong-phai-guid' }))).toThrow(Error);
  });

  it.each(['https://api.dicebear.com/7.x/identicon/svg?seed=tripory', '', null])(
    'avatar mặc định hoặc rỗng (%j) thành null',
    (avatarUrl) => {
      expect(withAuthor({ id: AUTHOR_ID_FIXTURE, displayName: 'Lan', avatarUrl })?.author?.avatarUrl).toBeNull();
    },
  );

  it('avatarUrl thiếu thành null', () => {
    expect(withAuthor({ id: AUTHOR_ID_FIXTURE, displayName: 'Lan' }).author?.avatarUrl).toBeNull();
  });

  it('giữ avatar thật', () => {
    expect(
      withAuthor({ id: AUTHOR_ID_FIXTURE, displayName: 'Lan', avatarUrl: 'https://cdn.tripory.vn/a.png' }).author
        ?.avatarUrl,
    ).toBe('https://cdn.tripory.vn/a.png');
  });

  it('cắt khoảng trắng tên', () => {
    expect(withAuthor({ id: AUTHOR_ID_FIXTURE, displayName: '  Lan  ', avatarUrl: null }).author?.displayName).toBe(
      'Lan',
    );
  });

  it.each([
    ['id sai', { id: 'x', displayName: 'Lan', avatarUrl: null }],
    ['tên rỗng', { id: AUTHOR_ID_FIXTURE, displayName: '   ', avatarUrl: null }],
  ])('author %s thành null', (_name, author) => {
    expect(withAuthor(author).author).toBeNull();
  });

  it('author null giữ null', () => {
    expect(withAuthor(null).author).toBeNull();
  });

  it('freeze và không có email', () => {
    const result = toComment(
      commentDto.parse({ ...commentJsonFixture, author: { ...commentJsonFixture.author, email: 'a@b.c' } }),
    );
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.author)).toBe(true);
    expect(Object.keys(result.author ?? {})).toEqual(['id', 'displayName', 'avatarUrl']);
    expect(JSON.stringify(result)).not.toContain('email');
  });
});

describe('toCommentPage', () => {
  it('map từng phần tử và giữ thông tin trang', () => {
    const page = toCommentPage(commentPageDto.parse(commentPageJsonFixture(10, true)));
    expect(page.items).toHaveLength(10);
    expect(page).toMatchObject({ pageIndex: 1, pageSize: 10, totalCount: 11, hasNextPage: true });
    expect(Object.isFrozen(page.items)).toBe(true);
  });
});
