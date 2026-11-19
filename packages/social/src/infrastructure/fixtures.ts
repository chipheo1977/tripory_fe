// JSON mẫu của BE cho test infrastructure. không export qua barrel; không import `vitest`.
export const AUTHOR_ID_FIXTURE = '3f2504e0-4f89-11d3-9a0c-0305e82c3301';
export const COMMENT_ID_FIXTURE = '7c9e6679-7425-40de-944b-e07fc1f90ae7';

export const likeStateJsonFixture = { likeCount: 13, likedByMe: true };

export const commentJsonFixture = {
  id: COMMENT_ID_FIXTURE,
  content: 'Đẹp quá!\nMình sẽ đi thử.',
  createdAt: '2026-11-12T08:08:08.8812345+00:00',
  author: { id: AUTHOR_ID_FIXTURE, displayName: 'Trần Thị Lan', avatarUrl: null },
};

const commentAt = (n: number) => ({
  ...commentJsonFixture,
  id: `c0000000-0000-4000-8000-${String(n).padStart(12, '0')}`,
  content: `Bình luận số ${n}`,
});

export const commentPageJsonFixture = (count: 10 | 2 = 10, hasNextPage = false) => ({
  items: Array.from({ length: count }, (_, index) => commentAt(index + 1)),
  pageIndex: 1,
  pageSize: 10,
  totalCount: hasNextPage ? count + 1 : count,
  totalPages: hasNextPage ? 2 : 1,
  hasNextPage,
  hasPreviousPage: false,
});
