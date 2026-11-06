import { createWgs84Coordinate, type Wgs84Coordinate } from '@tripory/shared-kernel';
import { describe, expect, it, vi } from 'vitest';
import { createNominatimReverseProvider } from './nominatim-reverse';

type FetchArgs = [input: RequestInfo | URL, init?: RequestInit];

const UA = 'Tripory/0.1 (+https://triporyv1.vercel.app)';

const coordinate = (latitude: number, longitude: number): Wgs84Coordinate => {
  const value = createWgs84Coordinate({ latitude, longitude });
  if (value === null) throw new Error('bad fixture');
  return value;
};

const DA_LAT = coordinate(11.9404, 108.4583);

// Hình dạng jsonv2 theo docs Nominatim Reverse, giá trị là dữ liệu mẫu.
const CHO_DA_LAT = {
  place_id: 1,
  osm_type: 'way',
  osm_id: 456,
  lat: '11.9431',
  lon: '108.4370',
  category: 'amenity',
  type: 'marketplace',
  name: 'Chợ Đà Lạt',
  address: {
    house_number: '1',
    road: 'Nguyễn Thị Minh Khai',
    quarter: 'Phường 1',
    city: 'Đà Lạt',
    state: 'Lâm Đồng',
    country_code: 'vn',
  },
};

const ROAD = {
  osm_type: 'way',
  osm_id: 789,
  lat: '11.9404',
  lon: '108.4583',
  category: 'highway',
  type: 'secondary',
  name: 'Hùng Vương',
  address: { road: 'Hùng Vương', suburb: 'Xuân Hương', town: 'Đà Lạt', state: 'Lâm Đồng', country_code: 'vn' },
};

const fetchReturning = (body: unknown, status = 200) =>
  vi.fn<(...args: FetchArgs) => Promise<Response>>(async () => Response.json(body, { status }));

const providerWith = (fetch: (...args: FetchArgs) => Promise<Response>) =>
  createNominatimReverseProvider({ fetch, baseUrl: 'https://nominatim.test', userAgent: UA });

describe('createNominatimReverseProvider', () => {
  it('GET /reverse jsonv2, zoom 18, addressdetails, accept-language=vi, UA riêng', async () => {
    const fetch = fetchReturning(CHO_DA_LAT);

    await providerWith(fetch).reverse(DA_LAT);

    const url = new URL(String(fetch.mock.calls[0]?.[0]));
    expect(`${url.origin}${url.pathname}`).toBe('https://nominatim.test/reverse');
    expect(Object.fromEntries(url.searchParams)).toEqual({
      format: 'jsonv2',
      lat: '11.9404',
      lon: '108.4583',
      zoom: '18',
      addressdetails: '1',
      'accept-language': 'vi',
    });
    const headers = new Headers(fetch.mock.calls[0]?.[1]?.headers);
    expect(headers.get('user-agent')).toBe(UA);
    expect(headers.has('cookie')).toBe(false);
  });

  it('map địa điểm: id, tên, địa chỉ theo D-148, mã nước viết hoa', async () => {
    expect(await providerWith(fetchReturning(CHO_DA_LAT)).reverse(DA_LAT)).toEqual({
      id: 'W456',
      name: 'Chợ Đà Lạt',
      address: '1 Nguyễn Thị Minh Khai, Phường 1, Đà Lạt, Lâm Đồng',
      coordinate: { latitude: 11.9431, longitude: 108.437 },
      category: 'other',
      countryCode: 'VN',
    });
  });

  it('đường thì không lấy tên; town thay cho city', async () => {
    expect(await providerWith(fetchReturning(ROAD)).reverse(DA_LAT)).toMatchObject({
      name: null,
      address: 'Hùng Vương, Xuân Hương, Đà Lạt, Lâm Đồng',
    });
  });

  it('body error (Unable to geocode) → ném', async () => {
    await expect(providerWith(fetchReturning({ error: 'Unable to geocode' })).reverse(DA_LAT)).rejects.toThrow(
      'place-provider-failed',
    );
  });

  it.each([403, 429, 500])('status %d → ném', async (status) => {
    await expect(providerWith(fetchReturning({}, status)).reverse(DA_LAT)).rejects.toThrow('place-provider-failed');
  });
});
