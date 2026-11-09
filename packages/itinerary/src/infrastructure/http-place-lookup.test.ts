import { makeApiError } from '@tripory/api-client';
import type { HttpClient } from '@tripory/api-client';
import { createWgs84Coordinate } from '@tripory/shared-kernel';
import { describe, expect, it, vi } from 'vitest';
import { createHttpPlaceLookup } from './http-place-lookup';

const fakeHttp = (reply: unknown) => {
  const send = vi.fn<HttpClient['send']>(async () => reply);
  const http: HttpClient = { send };

  return { http, send };
};

const PLACE = {
  id: 'N5661583321',
  name: 'Crazy House',
  address: '3 Huỳnh Thúc Kháng, Xuân Hương, Da Lat City, Lam Dong',
  coordinate: { latitude: 11.9351, longitude: 108.4306 },
  category: 'attraction',
  countryCode: 'VN',
};

const DA_LAT = createWgs84Coordinate({ latitude: 11.9351, longitude: 108.4306 });
if (DA_LAT === null) throw new Error('bad fixture');

describe('createHttpPlaceLookup', () => {
  it('search → GET /places/search { q, destination } và parse places', async () => {
    const { http, send } = fakeHttp({ places: [PLACE] });
    const signal = new AbortController().signal;

    const places = await createHttpPlaceLookup(http).search({ text: 'crazy', destinationCode: 'vn-lam-dong' }, signal);

    expect(send).toHaveBeenCalledWith({
      method: 'GET',
      path: '/places/search',
      query: { q: 'crazy', destination: 'vn-lam-dong' },
      signal,
    });
    expect(places).toEqual([PLACE]);
  });

  it('search không có điểm đến → destination null (http client bỏ khỏi query)', async () => {
    const { http, send } = fakeHttp({ places: [] });

    await createHttpPlaceLookup(http).search({ text: 'cho', destinationCode: null });

    expect(send.mock.calls[0]?.[0].query).toEqual({ q: 'cho', destination: null });
  });

  it('suggest → GET /places/suggestions { destination }', async () => {
    const { http, send } = fakeHttp({ places: [PLACE] });

    expect(await createHttpPlaceLookup(http).suggest('vn-lam-dong')).toHaveLength(1);
    expect(send.mock.calls[0]?.[0]).toMatchObject({
      method: 'GET',
      path: '/places/suggestions',
      query: { destination: 'vn-lam-dong' },
    });
  });

  it('reverse → GET /places/reverse { lat, lng }; place null → null', async () => {
    const { http, send } = fakeHttp({ place: null });

    expect(await createHttpPlaceLookup(http).reverse(DA_LAT)).toBeNull();
    expect(send.mock.calls[0]?.[0]).toMatchObject({
      method: 'GET',
      path: '/places/reverse',
      query: { lat: 11.9351, lng: 108.4306 },
    });
  });

  it('reverse trả place', async () => {
    const { http } = fakeHttp({ place: PLACE });

    expect(await createHttpPlaceLookup(http).reverse(DA_LAT)).toEqual(PLACE);
  });

  it.each([
    ['null', null],
    ['thiếu places', {}],
    ['category lạ', { places: [{ ...PLACE, category: 'bar' }] }],
    ['tọa độ ngoài khoảng', { places: [{ ...PLACE, coordinate: { latitude: 91, longitude: 0 } }] }],
  ] as const)('body sai (%s) → ném', async (_label, reply) => {
    const { http } = fakeHttp(reply);

    await expect(createHttpPlaceLookup(http).suggest('vn-lam-dong')).rejects.toThrow();
  });

  it('ApiError (429 Places.RateLimited) lan nguyên cùng tham chiếu', async () => {
    const error = makeApiError({ kind: 'http', status: 429, code: 'Places.RateLimited', message: null });
    const http: HttpClient = {
      send: vi.fn<HttpClient['send']>(async () => {
        throw error;
      }),
    };

    await expect(createHttpPlaceLookup(http).search({ text: 'cho', destinationCode: null })).rejects.toBe(error);
  });
});
