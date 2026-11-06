import { createWgs84Coordinate, type Wgs84Coordinate } from '@tripory/shared-kernel';
import { describe, expect, it } from 'vitest';
import { parseLocationInput } from './location-input';
import {
  composePlaceAddress,
  coordinateInputOf,
  isPlaceAllowed,
  isSearchableCoordinate,
  PLACE_CATEGORY_LABELS,
  PLACE_QUERY_MAX_LENGTH,
  placeCategoryOf,
  placeQueryText,
  planPlaceAutofill,
  SUGGESTION_CATEGORIES,
  type Place,
  type PlaceAddressParts,
} from './place';

const coordinate = (latitude: number, longitude: number): Wgs84Coordinate => {
  const value = createWgs84Coordinate({ latitude, longitude });
  if (value === null) throw new Error('bad fixture');
  return value;
};

const place = (overrides: Partial<Place> = {}): Place => ({
  id: 'N1',
  name: 'Hồ Xuân Hương',
  address: null,
  coordinate: coordinate(11.9404, 108.4583),
  category: 'attraction',
  countryCode: 'VN',
  ...overrides,
});

const NO_PARTS: PlaceAddressParts = {
  housenumber: null,
  street: null,
  district: null,
  city: null,
  county: null,
  state: null,
};

describe('placeCategoryOf', () => {
  it.each([
    ['tourism', 'chalet', 'lodging'],
    ['tourism', 'hotel', 'lodging'],
    ['tourism', 'guest_house', 'lodging'],
    ['tourism', 'museum', 'attraction'],
    ['tourism', 'information', 'attraction'],
    ['tourism', null, 'attraction'],
    ['amenity', 'cafe', 'food'],
    ['amenity', 'restaurant', 'food'],
    ['amenity', 'bank', 'other'],
    ['highway', 'residential', 'other'],
    [null, null, 'other'],
  ] as const)('%s=%s -> %s', (key, value, expected) => {
    expect(placeCategoryOf(key, value)).toBe(expected);
  });

  it('có nhãn tiếng Việt cho mọi danh mục, gợi ý theo thứ tự Tham quan, Ăn uống, Lưu trú', () => {
    expect(PLACE_CATEGORY_LABELS).toEqual({
      attraction: 'Tham quan',
      food: 'Ăn uống',
      lodging: 'Lưu trú',
      other: 'Địa điểm',
    });
    expect(SUGGESTION_CATEGORIES).toEqual(['attraction', 'food', 'lodging']);
  });
});

describe('composePlaceAddress', () => {
  it('ghép số nhà + đường, phường, thành phố, tỉnh', () => {
    expect(
      composePlaceAddress({
        housenumber: '12',
        street: 'Trần Phú',
        district: 'Phường 1',
        city: 'Đà Lạt',
        county: 'Phường Xuân Hương - Đà Lạt',
        state: 'Lâm Đồng',
      }),
    ).toBe('12 Trần Phú, Phường 1, Đà Lạt, Lâm Đồng');
  });

  it('bỏ đoạn trùng khi so không dấu, giữ đoạn khác chữ', () => {
    expect(
      composePlaceAddress({ ...NO_PARTS, district: 'Lâm Đồng', city: 'Da Lat City', state: 'lâm đồng' }),
    ).toBe('Lâm Đồng, Da Lat City');
    expect(composePlaceAddress({ ...NO_PARTS, district: 'Xuân Hương', city: 'Đà Lạt', state: 'Da Lat City' })).toBe(
      'Xuân Hương, Đà Lạt, Da Lat City',
    );
  });

  it('dùng county khi thiếu city', () => {
    expect(composePlaceAddress({ ...NO_PARTS, county: 'Phường Xuân Hương - Đà Lạt', state: 'Lâm Đồng' })).toBe(
      'Phường Xuân Hương - Đà Lạt, Lâm Đồng',
    );
  });

  it('bỏ số nhà khi không có đường, bỏ đoạn chỉ có khoảng trắng', () => {
    expect(composePlaceAddress({ ...NO_PARTS, housenumber: '12', district: '  ', state: 'Lâm Đồng' })).toBe(
      'Lâm Đồng',
    );
  });

  it('trả null khi không còn đoạn nào', () => {
    expect(composePlaceAddress(NO_PARTS)).toBeNull();
  });

  it('cắt tối đa 500 ký tự', () => {
    const address = composePlaceAddress({ ...NO_PARTS, street: 'a'.repeat(400), state: 'b'.repeat(400) });
    expect(address).toHaveLength(500);
  });
});

describe('chủ quyền và khung tìm kiếm (D-145)', () => {
  it.each([
    ['Phú Lâm (Hoàng Sa)', 16.83, 112.34],
    ['Ba Bình (Trường Sa)', 10.38, 114.36],
    ['ngoài VN', 13.75, 100.5],
  ])('từ chối %s', (_label, lat, lng) => {
    expect(isSearchableCoordinate(coordinate(lat, lng))).toBe(false);
    expect(isPlaceAllowed(place({ coordinate: coordinate(lat, lng) }))).toBe(false);
  });

  it.each([
    ['Hà Nội', 21.0285, 105.8542],
    ['Phú Quốc', 10.2899, 103.984],
    ['Côn Đảo', 8.6826, 106.6087],
    ['Bạch Long Vĩ', 20.1347, 107.7273],
  ])('nhận %s', (_label, lat, lng) => {
    expect(isSearchableCoordinate(coordinate(lat, lng))).toBe(true);
    expect(isPlaceAllowed(place({ coordinate: coordinate(lat, lng) }))).toBe(true);
  });

  it('từ chối countryCode khác VN hoặc thiếu', () => {
    expect(isPlaceAllowed(place({ countryCode: 'CN' }))).toBe(false);
    expect(isPlaceAllowed(place({ countryCode: null }))).toBe(false);
    expect(isPlaceAllowed(place({ countryCode: 'vn' }))).toBe(true);
  });

  it('không lọc theo tên: đường Trường Sa ở TP.HCM vẫn hợp lệ', () => {
    expect(isPlaceAllowed(place({ name: 'Đường Trường Sa', coordinate: coordinate(10.79, 106.68) }))).toBe(true);
  });
});

describe('placeQueryText', () => {
  it('bỏ khoảng trắng đầu cuối và gộp khoảng trắng', () => {
    expect(placeQueryText('  hồ   xuân\thương ')).toBe('hồ xuân hương');
  });

  it(`cắt tối đa ${PLACE_QUERY_MAX_LENGTH} ký tự`, () => {
    expect(placeQueryText('a'.repeat(150))).toHaveLength(PLACE_QUERY_MAX_LENGTH);
  });
});

describe('coordinateInputOf', () => {
  it('6 chữ số thập phân và đọc lại được bằng parseLocationInput', () => {
    const value = coordinate(11.94041234, 108.4583);
    const text = coordinateInputOf(value);

    expect(text).toBe('11.940412, 108.458300');
    expect(parseLocationInput(text)).toMatchObject({
      kind: 'coordinate',
      coordinate: { latitude: 11.940412, longitude: 108.4583 },
    });
  });
});

describe('planPlaceAutofill (D-149)', () => {
  const candidate = { name: 'Crazy House', address: '3 Huỳnh Thúc Kháng, Đà Lạt' };

  it('điền tên khi ô Tên trống và ghi đè địa chỉ', () => {
    expect(planPlaceAutofill({ name: ' ', address: 'cũ' }, null, candidate)).toEqual(candidate);
  });

  it('thay tên còn bằng giá trị tự điền lần trước', () => {
    expect(planPlaceAutofill({ name: 'Hồ Xuân Hương', address: '' }, 'Hồ Xuân Hương', candidate).name).toBe(
      'Crazy House',
    );
  });

  it('giữ tên người dùng đã gõ', () => {
    expect(planPlaceAutofill({ name: 'Nhà điên', address: '' }, 'Hồ Xuân Hương', candidate)).toEqual({
      address: candidate.address,
    });
  });

  it('giữ địa chỉ hiện tại khi địa điểm không có địa chỉ', () => {
    expect(planPlaceAutofill({ name: '', address: 'cũ' }, null, { name: 'Crazy House', address: null })).toEqual({
      name: 'Crazy House',
    });
  });

  it('không điền tên khi địa điểm không có tên', () => {
    expect(planPlaceAutofill({ name: '', address: '' }, null, { name: null, address: null })).toEqual({});
  });

  it('cắt tên 200 và địa chỉ 500 ký tự', () => {
    const plan = planPlaceAutofill({ name: '', address: '' }, null, { name: 'n'.repeat(300), address: 'a'.repeat(600) });
    expect(plan.name).toHaveLength(200);
    expect(plan.address).toHaveLength(500);
  });
});
