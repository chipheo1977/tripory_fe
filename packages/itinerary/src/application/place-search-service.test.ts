import { createWgs84Coordinate, type Wgs84Coordinate } from '@tripory/shared-kernel';
import { describe, expect, it, vi } from 'vitest';
import { VIETNAM_SEARCH_BOUNDS, type GeoBounds, type Place } from '../domain';
import { createPlaceSearchService } from './place-search-service';
import type { PlaceReverseProvider, PlaceSearchProvider } from './ports';

const coordinate = (latitude: number, longitude: number): Wgs84Coordinate => {
  const value = createWgs84Coordinate({ latitude, longitude });
  if (value === null) throw new Error('bad fixture');
  return value;
};

const DA_LAT = coordinate(11.9404, 108.4583);
const PHU_LAM = coordinate(16.83, 112.34);

const place = (id: string, overrides: Partial<Place> = {}): Place => ({
  id,
  name: `Điểm ${id}`,
  address: `Địa chỉ ${id}`,
  coordinate: DA_LAT,
  category: 'attraction',
  countryCode: 'VN',
  ...overrides,
});

const LAM_DONG: GeoBounds = [
  [107.2, 11.2],
  [108.8, 12.4],
];

const fakeProvider = (overrides: Partial<PlaceSearchProvider> = {}) => ({
  search: vi.fn<PlaceSearchProvider['search']>(async () => []),
  suggest: vi.fn<PlaceSearchProvider['suggest']>(async () => []),
  reverse: vi.fn<PlaceSearchProvider['reverse']>(async () => null),
  ...overrides,
});

const fakeFallback = (result: () => Promise<Place | null>) => ({
  reverse: vi.fn<PlaceReverseProvider['reverse']>(result),
});

describe('createPlaceSearchService.search', () => {
  it('không gọi nhà cung cấp khi từ khóa ngắn hơn 2 ký tự', async () => {
    const provider = fakeProvider();
    const service = createPlaceSearchService({ provider, reverseFallback: null });

    expect(await service.search({ text: '  h  ', bias: null })).toEqual([]);
    expect(provider.search).not.toHaveBeenCalled();
  });

  it('gửi từ khóa đã chuẩn hóa, khung VN, bias và limit 15', async () => {
    const provider = fakeProvider();
    const service = createPlaceSearchService({ provider, reverseFallback: null });
    const signal = new AbortController().signal;

    await service.search({ text: ' hồ   xuân ', bias: [108.45, 11.94] }, signal);

    expect(provider.search).toHaveBeenCalledWith(
      { text: 'hồ xuân', bounds: VIETNAM_SEARCH_BOUNDS, bias: [108.45, 11.94], limit: 15 },
      signal,
    );
  });

  it('bỏ kết quả CN, kết quả ở Hoàng Sa, trùng id; tối đa 10', async () => {
    const many = Array.from({ length: 12 }, (_, index) => place(`N${index}`));
    const provider = fakeProvider({
      search: vi.fn(async () => [
        place('CN1', { countryCode: 'CN' }),
        place('HS1', { coordinate: PHU_LAM }),
        place('N0'),
        ...many,
      ]),
    });
    const service = createPlaceSearchService({ provider, reverseFallback: null });

    const result = await service.search({ text: 'phu lam', bias: null });

    expect(result.map((item) => item.id)).toEqual(many.slice(0, 10).map((item) => item.id));
  });

  it('giữ kết quả không tên (UI hiện địa chỉ làm tiêu đề)', async () => {
    const provider = fakeProvider({ search: vi.fn(async () => [place('N1', { name: null })]) });
    const service = createPlaceSearchService({ provider, reverseFallback: null });

    expect(await service.search({ text: 'tran phu', bias: null })).toHaveLength(1);
  });

  it('lỗi nhà cung cấp lan ra', async () => {
    const provider = fakeProvider({ search: vi.fn(async () => Promise.reject(new Error('place-provider-failed'))) });
    const service = createPlaceSearchService({ provider, reverseFallback: null });

    await expect(service.search({ text: 'cho', bias: null })).rejects.toThrow('place-provider-failed');
  });
});

describe('createPlaceSearchService.suggest', () => {
  it('gọi mỗi nhóm một lần với limit 6, giữ thứ tự nhóm, bỏ không tên, bỏ ngoài VN, bỏ trùng', async () => {
    const suggest = vi.fn<PlaceSearchProvider['suggest']>(async ({ category }) => {
      if (category === 'attraction') return [place('A1'), place('A2', { name: null })];
      if (category === 'food') return [place('F1'), place('A1'), place('F2', { countryCode: 'CN' })];
      return [place('L1', { category: 'lodging' })];
    });
    const service = createPlaceSearchService({ provider: fakeProvider({ suggest }), reverseFallback: null });

    const result = await service.suggest(LAM_DONG);

    expect(suggest.mock.calls.map(([query]) => query)).toEqual([
      { bounds: LAM_DONG, category: 'attraction', limit: 6 },
      { bounds: LAM_DONG, category: 'food', limit: 6 },
      { bounds: LAM_DONG, category: 'lodging', limit: 6 },
    ]);
    expect(result.map((item) => item.id)).toEqual(['A1', 'F1', 'L1']);
  });

  it('tối đa 15 kết quả', async () => {
    const provider = fakeProvider({
      suggest: vi.fn(async ({ category }) => Array.from({ length: 6 }, (_, index) => place(`${category}${index}`))),
    });
    const service = createPlaceSearchService({ provider, reverseFallback: null });

    expect(await service.suggest(LAM_DONG)).toHaveLength(15);
  });

  it('một nhóm lỗi thì trả các nhóm còn lại', async () => {
    const provider = fakeProvider({
      suggest: vi.fn(async ({ category }) => {
        if (category === 'food') throw new Error('place-provider-failed');
        return [place(category)];
      }),
    });
    const service = createPlaceSearchService({ provider, reverseFallback: null });

    expect((await service.suggest(LAM_DONG)).map((item) => item.id)).toEqual(['attraction', 'lodging']);
  });

  it('mọi nhóm lỗi thì ném lỗi đầu tiên', async () => {
    const provider = fakeProvider({
      suggest: vi.fn(async ({ category }) => {
        throw new Error(`fail-${category}`);
      }),
    });
    const service = createPlaceSearchService({ provider, reverseFallback: null });

    await expect(service.suggest(LAM_DONG)).rejects.toThrow('fail-attraction');
  });
});

describe('createPlaceSearchService.reverse', () => {
  it('tọa độ Hoàng Sa trả null và không gọi nhà cung cấp nào', async () => {
    const provider = fakeProvider();
    const fallback = fakeFallback(async () => place('NOM'));
    const service = createPlaceSearchService({ provider, reverseFallback: fallback });

    expect(await service.reverse(PHU_LAM)).toBeNull();
    expect(await service.reverse(coordinate(10.38, 114.36))).toBeNull();
    expect(provider.reverse).not.toHaveBeenCalled();
    expect(fallback.reverse).not.toHaveBeenCalled();
  });

  it('không gọi dự phòng khi Photon có địa chỉ', async () => {
    const provider = fakeProvider({ reverse: vi.fn(async () => place('P1')) });
    const fallback = fakeFallback(async () => place('NOM'));
    const service = createPlaceSearchService({ provider, reverseFallback: fallback });

    expect((await service.reverse(DA_LAT))?.id).toBe('P1');
    expect(fallback.reverse).not.toHaveBeenCalled();
  });

  it('gọi dự phòng khi Photon thiếu địa chỉ, lấy địa chỉ dự phòng và giữ tên Photon', async () => {
    const provider = fakeProvider({ reverse: vi.fn(async () => place('P1', { address: null })) });
    const fallback = fakeFallback(async () => place('NOM', { name: 'Tên Nominatim', address: 'Hùng Vương, Đà Lạt' }));
    const service = createPlaceSearchService({ provider, reverseFallback: fallback });

    expect(await service.reverse(DA_LAT)).toMatchObject({ id: 'P1', name: 'Điểm P1', address: 'Hùng Vương, Đà Lạt' });
    expect(fallback.reverse).toHaveBeenCalledTimes(1);
  });

  it('lấy tên dự phòng khi Photon không có tên', async () => {
    const provider = fakeProvider({ reverse: vi.fn(async () => place('P1', { name: null, address: null })) });
    const fallback = fakeFallback(async () => place('NOM', { name: 'Chợ Đà Lạt' }));
    const service = createPlaceSearchService({ provider, reverseFallback: fallback });

    expect((await service.reverse(DA_LAT))?.name).toBe('Chợ Đà Lạt');
  });

  it('Photon trả null thì dùng kết quả dự phòng', async () => {
    const fallback = fakeFallback(async () => place('NOM'));
    const service = createPlaceSearchService({ provider: fakeProvider(), reverseFallback: fallback });

    expect((await service.reverse(DA_LAT))?.id).toBe('NOM');
  });

  it('nuốt lỗi dự phòng và giữ kết quả Photon', async () => {
    const provider = fakeProvider({ reverse: vi.fn(async () => place('P1', { address: null })) });
    const fallback = fakeFallback(async () => Promise.reject(new Error('nominatim down')));
    const service = createPlaceSearchService({ provider, reverseFallback: fallback });

    expect((await service.reverse(DA_LAT))?.id).toBe('P1');
  });

  it('bỏ kết quả không hợp lệ của cả hai nguồn', async () => {
    const provider = fakeProvider({ reverse: vi.fn(async () => place('P1', { countryCode: 'CN' })) });
    const fallback = fakeFallback(async () => place('NOM', { countryCode: 'CN' }));
    const service = createPlaceSearchService({ provider, reverseFallback: fallback });

    expect(await service.reverse(DA_LAT)).toBeNull();
  });

  it('không có dự phòng thì trả kết quả Photon dù thiếu địa chỉ', async () => {
    const provider = fakeProvider({ reverse: vi.fn(async () => place('P1', { address: null })) });
    const service = createPlaceSearchService({ provider, reverseFallback: null });

    expect((await service.reverse(DA_LAT))?.address).toBeNull();
  });
});
