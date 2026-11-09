import { createWgs84Coordinate, type Wgs84Coordinate } from '@tripory/shared-kernel';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { GeoBounds } from '../domain';
import { createPhotonPlaceSearchProvider } from './photon-place-search';

type FetchArgs = [input: RequestInfo | URL, init?: RequestInit];

const UA = 'Tripory/0.1 (+https://triporyv1.vercel.app)';
const BASE = 'https://photon.test/';

const VN: GeoBounds = [
  [102.1, 8.1],
  [109.7, 23.4],
];

const coordinate = (latitude: number, longitude: number): Wgs84Coordinate => {
  const value = createWgs84Coordinate({ latitude, longitude });
  if (value === null) throw new Error('bad fixture');
  return value;
};

// Rút gọn từ kết quả thật của photon.komoot.io (probe 2026-11-06).
const CRAZY_HOUSE = {
  type: 'Feature',
  geometry: { type: 'Point', coordinates: [108.4306, 11.9351] },
  properties: {
    osm_type: 'N',
    osm_id: 5661583321,
    osm_key: 'tourism',
    osm_value: 'museum',
    name: 'Crazy House',
    housenumber: '3',
    street: 'Huỳnh Thúc Kháng',
    district: 'Xuân Hương',
    city: 'Da Lat City',
    state: 'Lam Dong',
    countrycode: 'VN',
  },
};

const HUNG_VUONG = {
  type: 'Feature',
  geometry: { type: 'Point', coordinates: [108.4583, 11.9404] },
  properties: {
    osm_type: 'W',
    osm_id: 123,
    osm_key: 'highway',
    osm_value: 'secondary',
    name: 'Hùng Vương',
    district: 'Xuân Hương',
    city: 'Đà Lạt',
    state: 'Lâm Đồng',
    countrycode: 'VN',
  },
};

const UNNAMED_CAFE = {
  type: 'Feature',
  geometry: { type: 'Point', coordinates: [108.44, 11.94] },
  properties: { osm_type: 'N', osm_id: 7, osm_key: 'amenity', osm_value: 'cafe', countrycode: 'VN' },
};

const collection = (...features: unknown[]) => ({ type: 'FeatureCollection', features });

const fetchReturning = (response: () => Response) =>
  vi.fn<(...args: FetchArgs) => Promise<Response>>(async () => response());

const jsonResponse = (body: unknown, status = 200) => () => Response.json(body, { status });

const urlOf = (fetch: ReturnType<typeof fetchReturning>, call = 0): URL => new URL(String(fetch.mock.calls[call]?.[0]));

const providerWith = (fetch: (...args: FetchArgs) => Promise<Response>) =>
  createPhotonPlaceSearchProvider({ fetch, baseUrl: BASE, userAgent: UA });

afterEach(() => {
  vi.useRealTimers();
});

describe('createPhotonPlaceSearchProvider.search', () => {
  it('GET /api với q, limit, lang=default, countrycode=VN, bbox và bias', async () => {
    const fetch = fetchReturning(jsonResponse(collection(CRAZY_HOUSE)));

    await providerWith(fetch).search({ text: 'crazy house', bounds: VN, bias: [108.45, 11.94], limit: 15 });

    const url = urlOf(fetch);
    expect(`${url.origin}${url.pathname}`).toBe('https://photon.test/api');
    expect(Object.fromEntries(url.searchParams)).toEqual({
      q: 'crazy house',
      limit: '15',
      lang: 'default',
      countrycode: 'VN',
      bbox: '102.1,8.1,109.7,23.4',
      lat: '11.94',
      lon: '108.45',
      zoom: '10',
    });
    expect(String(fetch.mock.calls[0]?.[0])).toContain('bbox=102.1,8.1,109.7,23.4');
  });

  it('không có bias thì không gửi lat/lon/zoom', async () => {
    const fetch = fetchReturning(jsonResponse(collection()));

    await providerWith(fetch).search({ text: 'cho', bounds: VN, bias: null, limit: 15 });

    const params = urlOf(fetch).searchParams;
    expect(params.has('lat')).toBe(false);
    expect(params.has('zoom')).toBe(false);
  });

  it('chỉ gửi accept và user-agent, không cookie hay Authorization', async () => {
    const fetch = fetchReturning(jsonResponse(collection()));

    await providerWith(fetch).search({ text: 'cho', bounds: VN, bias: null, limit: 15 });

    const headers = new Headers(fetch.mock.calls[0]?.[1]?.headers);
    expect(headers.get('user-agent')).toBe(UA);
    expect(headers.get('accept')).toBe('application/json');
    expect(headers.has('cookie')).toBe(false);
    expect(headers.has('authorization')).toBe(false);
    expect(fetch.mock.calls[0]?.[1]?.method).toBe('GET');
  });

  it('map Crazy House: id, danh mục, địa chỉ, mã nước', async () => {
    const fetch = fetchReturning(jsonResponse(collection(CRAZY_HOUSE)));

    const [place] = await providerWith(fetch).search({ text: 'crazy', bounds: VN, bias: null, limit: 15 });

    expect(place).toEqual({
      id: 'N5661583321',
      name: 'Crazy House',
      address: '3 Huỳnh Thúc Kháng, Xuân Hương, Da Lat City, Lam Dong',
      coordinate: { latitude: 11.9351, longitude: 108.4306 },
      category: 'attraction',
      countryCode: 'VN',
    });
  });

  it('giữ feature không tên (name null), bỏ feature hỏng', async () => {
    const broken = { type: 'Feature', geometry: { type: 'Point', coordinates: [1] }, properties: {} };
    const outOfRange = { ...UNNAMED_CAFE, geometry: { type: 'Point', coordinates: [200, 11] } };
    const fetch = fetchReturning(jsonResponse(collection(UNNAMED_CAFE, broken, outOfRange)));

    const places = await providerWith(fetch).search({ text: 'cafe', bounds: VN, bias: null, limit: 15 });

    expect(places).toEqual([expect.objectContaining({ id: 'N7', name: null, address: null, category: 'food' })]);
  });

  it('đường (highway) trong kết quả tìm vẫn giữ tên và tên là phần đường của địa chỉ', async () => {
    const fetch = fetchReturning(jsonResponse(collection(HUNG_VUONG)));

    const [place] = await providerWith(fetch).search({ text: 'hung vuong', bounds: VN, bias: null, limit: 15 });

    expect(place?.name).toBe('Hùng Vương');
    expect(place?.address).toBe('Hùng Vương, Xuân Hương, Đà Lạt, Lâm Đồng');
  });
});

describe('createPhotonPlaceSearchProvider.suggest', () => {
  it.each([
    ['attraction', 'osm.tourism.attraction,osm.tourism.museum,osm.tourism.viewpoint,osm.tourism.artwork'],
    ['food', 'osm.amenity.restaurant,osm.amenity.cafe,osm.amenity.fast_food'],
    ['lodging', 'osm.tourism.hotel,osm.tourism.guest_house,osm.tourism.hostel,osm.tourism.motel,osm.tourism.chalet'],
  ] as const)('%s: include đúng danh sách, bbox, limit, không có q', async (category, includePrefix) => {
    const fetch = fetchReturning(jsonResponse(collection()));
    const bounds: GeoBounds = [
      [107.2, 11.2],
      [108.8, 12.4],
    ];

    await providerWith(fetch).suggest({ bounds, category, limit: 6 });

    const url = urlOf(fetch);
    expect(url.pathname).toBe('/api');
    expect(url.searchParams.has('q')).toBe(false);
    expect(url.searchParams.get('include')?.startsWith(includePrefix)).toBe(true);
    expect(url.searchParams.get('bbox')).toBe('107.2,11.2,108.8,12.4');
    expect(url.searchParams.get('limit')).toBe('6');
    expect(url.searchParams.get('lang')).toBe('default');
  });
});

describe('createPhotonPlaceSearchProvider.reverse', () => {
  it('GET /reverse?lat&lon&limit=1&lang=default; đường thì không có tên', async () => {
    const fetch = fetchReturning(jsonResponse(collection(HUNG_VUONG)));

    const place = await providerWith(fetch).reverse(coordinate(11.9404, 108.4583));

    expect(Object.fromEntries(urlOf(fetch).searchParams)).toEqual({
      lat: '11.9404',
      lon: '108.4583',
      limit: '1',
      lang: 'default',
    });
    expect(urlOf(fetch).pathname).toBe('/reverse');
    expect(place).toMatchObject({ name: null, address: 'Hùng Vương, Xuân Hương, Đà Lạt, Lâm Đồng', category: 'other' });
  });

  it('địa điểm (POI) thì giữ tên', async () => {
    const fetch = fetchReturning(jsonResponse(collection(CRAZY_HOUSE)));

    expect((await providerWith(fetch).reverse(coordinate(11.9351, 108.4306)))?.name).toBe('Crazy House');
  });

  it('không có feature → null', async () => {
    const fetch = fetchReturning(jsonResponse(collection()));

    expect(await providerWith(fetch).reverse(coordinate(11.9, 108.4))).toBeNull();
  });
});

describe('createPhotonPlaceSearchProvider: lỗi', () => {
  it.each([400, 500, 503])('status %d → ném place-provider-failed', async (status) => {
    const fetch = fetchReturning(jsonResponse({ message: 'lỗi' }, status));

    await expect(providerWith(fetch).search({ text: 'cho', bounds: VN, bias: null, limit: 15 })).rejects.toThrow(
      'place-provider-failed',
    );
  });

  it('lỗi mạng → ném place-provider-failed', async () => {
    const fetch = vi.fn<(...args: FetchArgs) => Promise<Response>>(async () => {
      throw new TypeError('fetch failed');
    });

    await expect(providerWith(fetch).reverse(coordinate(11.9, 108.4))).rejects.toThrow('place-provider-failed');
  });

  it('JSON hỏng hoặc thiếu features → ném place-provider-failed', async () => {
    await expect(
      providerWith(fetchReturning(() => new Response('<html>', { status: 200 }))).reverse(coordinate(11.9, 108.4)),
    ).rejects.toThrow('place-provider-failed');
    await expect(
      providerWith(fetchReturning(jsonResponse({ hello: 1 }))).reverse(coordinate(11.9, 108.4)),
    ).rejects.toThrow('place-provider-failed');
  });

  it('quá 5 giây → hủy request và ném place-provider-failed', async () => {
    vi.useFakeTimers();
    const fetch = vi.fn<(...args: FetchArgs) => Promise<Response>>(
      (_input, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
        }),
    );

    const pending = providerWith(fetch).search({ text: 'cho', bounds: VN, bias: null, limit: 15 });
    const assertion = expect(pending).rejects.toThrow('place-provider-failed');
    await vi.advanceTimersByTimeAsync(5_000);

    await assertion;
    expect(fetch.mock.calls[0]?.[1]?.signal?.aborted).toBe(true);
  });

  it('signal của caller hủy thì request bị hủy', async () => {
    const controller = new AbortController();
    const fetch = vi.fn<(...args: FetchArgs) => Promise<Response>>(
      (_input, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
        }),
    );

    const pending = providerWith(fetch).reverse(coordinate(11.9, 108.4), controller.signal);
    controller.abort();

    await expect(pending).rejects.toThrow('place-provider-failed');
  });
});
