import { makeApiError } from '@tripory/api-client';
import type { HttpClient } from '@tripory/api-client';
import { describe, expect, it, vi } from 'vitest';
import { createHttpShortLinkResolver } from './http-short-link-resolver';

const fakeHttp = (reply: unknown) => {
  const send = vi.fn<HttpClient['send']>(async () => reply);
  const http: HttpClient = { send };

  return { http, send };
};

const SHORT = 'https://maps.app.goo.gl/abc123';
const FULL = 'https://www.google.com/maps/place/Ch%E1%BB%A3+B%E1%BA%BFn+Th%C3%A0nh/@10.7725,106.7009,17z';

describe('createHttpShortLinkResolver.resolve', () => {
  it('POST /maps/resolve với { url }, truyền signal và trả data.url', async () => {
    const { http, send } = fakeHttp({ url: FULL });
    const controller = new AbortController();

    const resolved = await createHttpShortLinkResolver(http).resolve(SHORT, controller.signal);

    expect(send).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledWith({
      method: 'POST',
      path: '/maps/resolve',
      body: { url: SHORT },
      signal: controller.signal,
    });
    expect(resolved).toBe(FULL);
  });

  it.each([
    ['data là null', null],
    ['data là chuỗi', FULL],
    ['thiếu url', {}],
    ['url không phải chuỗi', { url: 42 }],
  ] as const)('body sai hình dạng (%s) thì ném lỗi', async (_name, reply) => {
    const { http } = fakeHttp(reply);

    await expect(createHttpShortLinkResolver(http).resolve(SHORT)).rejects.toThrow();
  });

  it('ApiError (422 Maps.UnresolvableLink) lan nguyên cùng tham chiếu', async () => {
    const error = makeApiError({
      kind: 'http',
      status: 422,
      code: 'Maps.UnresolvableLink',
      message: 'Không đọc được link.',
    });
    const http: HttpClient = {
      send: vi.fn<HttpClient['send']>(async () => {
        throw error;
      }),
    };

    await expect(createHttpShortLinkResolver(http).resolve(SHORT)).rejects.toBe(error);
  });
});
