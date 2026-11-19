import { describe, expect, it } from 'vitest';
import { commentDto, commentPageDto, likeStateDto } from './dto';
import { commentJsonFixture, commentPageJsonFixture, likeStateJsonFixture } from './fixtures';

describe('likeStateDto', () => {
  it('parse được trạng thái hợp lệ', () => {
    expect(likeStateDto.parse(likeStateJsonFixture)).toEqual({ likeCount: 13, likedByMe: true });
  });

  it.each([
    ['likeCount âm', { likeCount: -1, likedByMe: true }],
    ['likeCount lẻ', { likeCount: 1.5, likedByMe: true }],
    ['likeCount là chuỗi', { likeCount: '13', likedByMe: true }],
    ['thiếu likedByMe', { likeCount: 13 }],
  ])('từ chối %s', (_name, json) => {
    expect(likeStateDto.safeParse(json).success).toBe(false);
  });
});

describe('commentDto', () => {
  it('parse được khi author thiếu', () => {
    const { author, ...rest } = commentJsonFixture;
    void author;
    expect(commentDto.safeParse(rest).success).toBe(true);
  });

  it('parse được khi author null', () => {
    expect(commentDto.safeParse({ ...commentJsonFixture, author: null }).success).toBe(true);
  });

  it('createdAt phải là ISO có offset', () => {
    expect(commentDto.safeParse(commentJsonFixture).success).toBe(true);
    expect(commentDto.safeParse({ ...commentJsonFixture, createdAt: '2026-11-12 08:08' }).success).toBe(false);
  });

  it('bỏ khóa lạ email khỏi author', () => {
    const parsed = commentDto.parse({
      ...commentJsonFixture,
      author: { ...commentJsonFixture.author, email: 'a@b.c' },
    });
    expect(Object.keys(parsed.author ?? {})).not.toContain('email');
  });
});

describe('commentPageDto', () => {
  it('giữ trường FE dùng, bỏ totalPages và hasPreviousPage', () => {
    const parsed = commentPageDto.parse(commentPageJsonFixture(2, true));
    expect(Object.keys(parsed).sort()).toEqual(['hasNextPage', 'items', 'pageIndex', 'pageSize', 'totalCount']);
    expect(parsed.items).toHaveLength(2);
    expect(parsed.hasNextPage).toBe(true);
  });
});
