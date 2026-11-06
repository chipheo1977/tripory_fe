// Luật thuần của tìm địa điểm (MAP-01, D-145..D-149). Không gọi mạng, không đọc đồng hồ: adapter Photon/Nominatim
// ở `infrastructure` đổi dữ liệu nhà cung cấp sang `Place`, service ở `application` lọc theo các luật dưới đây.
import type { Wgs84Coordinate } from '@tripory/shared-kernel';
import { normalizeSearchText } from './destination-search';
import { boundsContain, type GeoBounds, type LngLat } from './geo-bounds';

/** Chỉ để hiển thị nhãn và lọc gợi ý; form và BE không có trường danh mục nên không bao giờ được lưu (D-147). */
export type PlaceCategory = 'attraction' | 'food' | 'lodging' | 'other';
export type SuggestionCategory = Exclude<PlaceCategory, 'other'>;

/**
 * Một địa điểm từ nhà cung cấp. `id` là chữ cái loại OSM + id (vd. `N5661583321`), chỉ dùng ở client;
 * lưu `place_id` cần BE thêm trường (D-152).
 */
export type Place = Readonly<{
  id: string;
  name: string | null;
  address: string | null;
  coordinate: Wgs84Coordinate;
  category: PlaceCategory;
  countryCode: string | null;
}>;

export type PlaceAddressParts = Readonly<{
  housenumber: string | null;
  street: string | null;
  district: string | null;
  city: string | null;
  county: string | null;
  state: string | null;
}>;

export const PLACE_CATEGORY_LABELS: Readonly<Record<PlaceCategory, string>> = Object.freeze({
  attraction: 'Tham quan',
  food: 'Ăn uống',
  lodging: 'Lưu trú',
  other: 'Địa điểm',
});

/** Thứ tự nhóm gợi ý theo điểm đến (D-146). */
export const SUGGESTION_CATEGORIES: readonly SuggestionCategory[] = Object.freeze(['attraction', 'food', 'lodging']);

export const ATTRACTION_TOURISM_VALUES: readonly string[] = Object.freeze([
  'attraction',
  'museum',
  'viewpoint',
  'artwork',
  'gallery',
  'theme_park',
  'zoo',
  'aquarium',
]);

export const FOOD_AMENITY_VALUES: readonly string[] = Object.freeze([
  'restaurant',
  'cafe',
  'fast_food',
  'food_court',
  'bar',
  'pub',
  'ice_cream',
]);

// Rộng hơn `tourism=hotel` vì nhiều khách sạn ở VN được gắn `chalet`/`guest_house` (D-147).
export const LODGING_TOURISM_VALUES: readonly string[] = Object.freeze([
  'hotel',
  'guest_house',
  'hostel',
  'motel',
  'chalet',
  'apartment',
]);

/** `tourism` lưu trú → Lưu trú; `tourism` khác → Tham quan; `amenity` ăn uống → Ăn uống; còn lại → Địa điểm. */
export function placeCategoryOf(osmKey: string | null, osmValue: string | null): PlaceCategory {
  const value = osmValue ?? '';
  if (osmKey === 'tourism') return LODGING_TOURISM_VALUES.includes(value) ? 'lodging' : 'attraction';
  if (osmKey === 'amenity' && FOOD_AMENITY_VALUES.includes(value)) return 'food';
  return 'other';
}

// Khớp giới hạn cột Name (200) và Address (500) của BE, như `location-input.ts`.
const MAX_NAME_LENGTH = 200;
const MAX_ADDRESS_LENGTH = 500;
const WHITESPACE_RUNS = /\s+/g;

const isHighSurrogate = (code: number): boolean => code >= 0xd800 && code <= 0xdbff;

// Không cắt giữa một cặp surrogate (emoji) để khỏi để lại nửa ký tự.
const truncate = (value: string, max: number): string => {
  if (value.length <= max) return value;
  const end = isHighSurrogate(value.charCodeAt(max - 1)) ? max - 1 : max;
  return value.slice(0, end).trimEnd();
};

const textOrNull = (value: string | null): string | null => {
  const text = value?.trim() ?? '';
  return text === '' ? null : text;
};

const streetSegment = (housenumber: string | null, street: string | null): string | null => {
  if (street === null) return null;
  return housenumber === null ? street : `${housenumber} ${street}`;
};

/**
 * Địa chỉ một dòng: `[số nhà + đường, quận/phường, thành phố ?? huyện, tỉnh]`, bỏ đoạn rỗng và đoạn trùng
 * (so không dấu), nối bằng ", ", tối đa 500 ký tự; `null` khi không còn gì (D-148).
 */
export function composePlaceAddress(parts: PlaceAddressParts): string | null {
  const segments = [
    streetSegment(textOrNull(parts.housenumber), textOrNull(parts.street)),
    textOrNull(parts.district),
    textOrNull(parts.city) ?? textOrNull(parts.county),
    textOrNull(parts.state),
  ];
  const seen = new Set<string>();
  const kept: string[] = [];

  for (const segment of segments) {
    if (segment === null) continue;
    const key = normalizeSearchText(segment);
    if (seen.has(key)) continue;
    seen.add(key);
    kept.push(segment);
  }

  if (kept.length === 0) return null;
  return truncate(kept.join(', '), MAX_ADDRESS_LENGTH);
}

/** Đất liền và đảo ven bờ (Phú Quốc, Côn Đảo, Thổ Chu, Bạch Long Vĩ). Khác `VIETNAM_VIEW_BOUNDS` (chỉ để xem). */
export const VIETNAM_SEARCH_BOUNDS: GeoBounds = [
  [102.1, 8.1],
  [109.7, 23.4],
];

export const HOANG_SA_BOUNDS: GeoBounds = [
  [110.9, 15.4],
  [113.2, 17.4],
];

export const TRUONG_SA_BOUNDS: GeoBounds = [
  [111.0, 5.5],
  [118.0, 12.2],
];

const lngLatOf = (coordinate: Wgs84Coordinate): LngLat => [coordinate.longitude, coordinate.latitude];

/** Trong khung tìm kiếm VN và ngoài khung Hoàng Sa/Trường Sa (D-145). */
export function isSearchableCoordinate(coordinate: Wgs84Coordinate): boolean {
  const point = lngLatOf(coordinate);
  if (!boundsContain(VIETNAM_SEARCH_BOUNDS, point)) return false;
  return !boundsContain(HOANG_SA_BOUNDS, point) && !boundsContain(TRUONG_SA_BOUNDS, point);
}

/** Mã nước phải là VN và tọa độ phải tìm được. Không lọc theo từ khóa: TP.HCM có đường Hoàng Sa, Trường Sa. */
export function isPlaceAllowed(place: Place): boolean {
  if (place.countryCode?.toUpperCase() !== 'VN') return false;
  return isSearchableCoordinate(place.coordinate);
}

export const PLACE_QUERY_MIN_LENGTH = 2;
export const PLACE_QUERY_MAX_LENGTH = 100;

/** Bỏ khoảng trắng đầu cuối, gộp khoảng trắng liên tiếp, tối đa 100 ký tự. */
export function placeQueryText(raw: string): string {
  return truncate(raw.trim().replace(WHITESPACE_RUNS, ' '), PLACE_QUERY_MAX_LENGTH);
}

/** Giá trị ô "Vị trí" khi chọn một địa điểm: "lat, lng" 6 chữ số thập phân, đọc lại được bằng `parseLocationInput`. */
export function coordinateInputOf(coordinate: Wgs84Coordinate): string {
  return `${coordinate.latitude.toFixed(6)}, ${coordinate.longitude.toFixed(6)}`;
}

export type PlaceFormText = Readonly<{ name: string; address: string }>;
export type PlaceAutofillCandidate = Readonly<{ name: string | null; address: string | null }>;
export type PlaceAutofill = Readonly<{ name?: string; address?: string }>;

/**
 * Trường cần ghi khi tự điền từ địa điểm (D-149). Địa chỉ luôn bị ghi đè khi địa điểm có địa chỉ. Tên chỉ được điền
 * khi ô Tên trống hoặc vẫn bằng giá trị tự điền lần trước (`lastAutoName`); tên người dùng gõ được giữ nguyên.
 */
export function planPlaceAutofill(
  current: PlaceFormText,
  lastAutoName: string | null,
  candidate: PlaceAutofillCandidate,
): PlaceAutofill {
  const name = textOrNull(candidate.name);
  const address = textOrNull(candidate.address);
  const nameIsAuto = current.name.trim() === '' || current.name === lastAutoName;
  const plan: { name?: string; address?: string } = {};

  if (name !== null && nameIsAuto) plan.name = truncate(name, MAX_NAME_LENGTH);
  if (address !== null) plan.address = truncate(address, MAX_ADDRESS_LENGTH);
  return plan;
}
