import { makeApiError } from '@tripory/api-client';
import type { HttpClient, HttpRequest } from '@tripory/api-client';
import { parseItineraryId } from '@tripory/shared-kernel';
import type { ItineraryId } from '@tripory/shared-kernel';
import { describe, expect, it, vi } from 'vitest';
import { parseCommentId } from '../domain';
import type { CommentId } from '../domain';
import { COMMENT_ID_FIXTURE, commentJsonFixture, commentPageJsonFixture, likeStateJsonFixture } from './fixtures';
import { createHttpSocialRepository } from './http-social-repository';

const ITINERARY = 'a1b2c3d4-0000-4000-8000-000000000001';
const itineraryId = parseItineraryId(ITINERARY) as ItineraryId;
const commentId = parseCommentId(COMMENT_ID_FIXTURE) as CommentId;

const fakeHttp = (reply: unknown = null) => {
  const send = vi.fn<HttpClient['send']>(async () => reply);
  const http: HttpClient = { send };
  return { http, send };
};
const failingHttp = (error: unknown) => {
  const send = vi.fn<HttpClient['send']>(async () => {
    throw error;
  });
  return { http: { send } as HttpClient, send };
};
const firstRequest = (send: ReturnType<typeof fakeHttp>['send']): HttpRequest => {
  const request = send.mock.calls[0]?.[0];
  if (request === undefined) throw new Error('send chưa được gọi');
  return request;
};

describe('like', () => {
  it('getLike gửi GET .../like với signal', async () => {
    const { http, send } = fakeHttp(likeStateJsonFixture);
    const controller = new AbortController();
    const state = await createHttpSocialRepository(http).getLike(itineraryId, controller.signal);
    expect(send).toHaveBeenCalledWith({ method: 'GET', path: `/itineraries/${ITINERARY}/like`, signal: controller.signal });
    expect(state).toEqual({ count: 13, liked: true });
  });

  it('like gửi PUT không body', async () => {
    const { http, send } = fakeHttp(likeStateJsonFixture);
    await createHttpSocialRepository(http).like(itineraryId);
    expect(send).toHaveBeenCalledWith({ method: 'PUT', path: `/itineraries/${ITINERARY}/like` });
  });

  it('unlike gửi DELETE và trả LikeState', async () => {
    const { http, send } = fakeHttp({ likeCount: 12, likedByMe: false });
    const state = await createHttpSocialRepository(http).unlike(itineraryId);
    expect(send).toHaveBeenCalledWith({ method: 'DELETE', path: `/itineraries/${ITINERARY}/like` });
    expect(state).toEqual({ count: 12, liked: false });
  });

  it('phản hồi thiếu likeCount thì reject', async () => {
    const { http } = fakeHttp({ likedByMe: true });
    await expect(createHttpSocialRepository(http).like(itineraryId)).rejects.toThrow();
  });
});

describe('comments', () => {
  it('listComments gửi query và signal, trả CommentPage', async () => {
    const { http, send } = fakeHttp(commentPageJsonFixture(2, false));
    const controller = new AbortController();
    const page = await createHttpSocialRepository(http).listComments(
      itineraryId,
      { pageIndex: 2, pageSize: 10 },
      controller.signal,
    );
    expect(send).toHaveBeenCalledWith({
      method: 'GET',
      path: `/itineraries/${ITINERARY}/comments`,
      query: { pageIndex: 2, pageSize: 10 },
      signal: controller.signal,
    });
    expect(page.items).toHaveLength(2);
  });

  it('listComments có comment id hỏng thì reject', async () => {
    const broken = { ...commentPageJsonFixture(2), items: [{ ...commentJsonFixture, id: 'x' }] };
    const { http } = fakeHttp(broken);
    await expect(createHttpSocialRepository(http).listComments(itineraryId, { pageIndex: 1, pageSize: 10 })).rejects.toThrow();
  });

  it('addComment gửi body đúng một khóa content và trả Comment', async () => {
    const { http, send } = fakeHttp(commentJsonFixture);
    const comment = await createHttpSocialRepository(http).addComment(itineraryId, 'Đẹp quá!');
    expect(send).toHaveBeenCalledWith({
      method: 'POST',
      path: `/itineraries/${ITINERARY}/comments`,
      body: { content: 'Đẹp quá!' },
    });
    expect(Object.keys(firstRequest(send).body as object)).toEqual(['content']);
    expect(comment.id).toBe(COMMENT_ID_FIXTURE);
  });

  it('removeComment gửi DELETE và trả removed', async () => {
    const { http, send } = fakeHttp(null);
    await expect(createHttpSocialRepository(http).removeComment(itineraryId, commentId)).resolves.toBe('removed');
    expect(send).toHaveBeenCalledWith({
      method: 'DELETE',
      path: `/itineraries/${ITINERARY}/comments/${COMMENT_ID_FIXTURE}`,
    });
  });

  it('removeComment gặp Comment.NotFound thì trả already-removed', async () => {
    const error = makeApiError({ kind: 'http', status: 404, code: 'Comment.NotFound', message: null });
    const { http } = failingHttp(error);
    await expect(createHttpSocialRepository(http).removeComment(itineraryId, commentId)).resolves.toBe('already-removed');
  });

  it.each([
    ['Itinerary.NotFound', makeApiError({ kind: 'http', status: 404, code: 'Itinerary.NotFound', message: null })],
    ['Comment.DeleteForbidden', makeApiError({ kind: 'http', status: 403, code: 'Comment.DeleteForbidden', message: null })],
    ['429', makeApiError({ kind: 'http', status: 429, code: 'RateLimit.TooManyRequests', message: null })],
    ['network', makeApiError({ kind: 'network', status: null, code: null, message: null })],
  ])('removeComment gặp %s thì reject nguyên vẹn', async (_name, error) => {
    const { http } = failingHttp(error);
    await expect(createHttpSocialRepository(http).removeComment(itineraryId, commentId)).rejects.toBe(error);
  });
});

describe('lỗi lan nguyên vẹn', () => {
  it('ApiError của mọi lệnh khác lan cùng tham chiếu', async () => {
    const error = makeApiError({ kind: 'http', status: 403, code: 'Social.DraftForbidden', message: null });
    const repo = createHttpSocialRepository(failingHttp(error).http);
    await expect(repo.getLike(itineraryId)).rejects.toBe(error);
    await expect(repo.like(itineraryId)).rejects.toBe(error);
    await expect(repo.unlike(itineraryId)).rejects.toBe(error);
    await expect(repo.listComments(itineraryId, { pageIndex: 1, pageSize: 10 })).rejects.toBe(error);
    await expect(repo.addComment(itineraryId, 'x')).rejects.toBe(error);
  });
});
