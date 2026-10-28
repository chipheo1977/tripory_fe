// Parse ô "Vị trí" (D-20, RESEARCH Pattern 7): tọa độ trần hoặc link Google Maps. Hàm thuần, chỉ thao tác chuỗi và
// regex, không dùng `URL` (React Native có `URL` không đầy đủ, domain phải chạy được cả ở đó), không đọc mạng,
// không đọc đồng hồ. Link rút gọn chỉ được NHẬN DIỆN ở đây; việc resolve là của route server, client parse lại
// URL đích bằng chính hàm này để chỉ có một đường code.
// Chuỗi vào là của người dùng (có thể là link độc hại) nên: host Google khớp chặt (chống `evil.com/maps/...`),
// `decodeURIComponent` bọc try/catch (chuỗi `%` hỏng ném `URIError`), tên/địa chỉ tự điền bỏ ký tự điều khiển
// và bị cắt độ dài. Kiểm ký tự điều khiển bằng mã ký tự như `safe-next-path.ts` để khỏi vướng `no-control-regex`.
import { createWgs84Coordinate, type Wgs84Coordinate } from '@tripory/shared-kernel';

export type LocationSource = 'coordinates' | 'place-data' | 'path' | 'query' | 'viewport';
export type PlaceHint = Readonly<{ name: string | null; address: string | null }>;
export type LocationParse =
  | Readonly<{ kind: 'coordinate'; coordinate: Wgs84Coordinate; place: PlaceHint; source: LocationSource }>
  | Readonly<{ kind: 'short-link'; url: string }>
  | Readonly<{ kind: 'no-coordinate'; place: PlaceHint }>
  | Readonly<{ kind: 'out-of-range' }>
  | Readonly<{ kind: 'empty' }>
  | Readonly<{ kind: 'invalid' }>;

// Khớp giới hạn cột Name (200) và Address (500) của BE; cắt ở đây để tên tự điền không bị form từ chối.
const MAX_NAME_LENGTH = 200;
const MAX_ADDRESS_LENGTH = 500;

const EMPTY: LocationParse = Object.freeze({ kind: 'empty' });
const INVALID: LocationParse = Object.freeze({ kind: 'invalid' });
const OUT_OF_RANGE: LocationParse = Object.freeze({ kind: 'out-of-range' });
const NO_PLACE: PlaceHint = Object.freeze({ name: null, address: null });

const NUMBER = String.raw`-?\d+(?:\.\d+)?`;

// "lat, lng" người dùng dán. Dấu thập phân chỉ là chấm (D-20): "10,7769 106,7009" không hợp lệ.
const BARE_COORDINATE = /^(-?\d{1,3}(?:\.\d+)?)\s*,\s*(-?\d{1,3}(?:\.\d+)?)$/;
const URL_PARTS = /^https?:\/\/([^/?#]+)([^?#]*)(?:\?([^#]*))?/i;
// Tên miền quốc gia: google.com, google.vn, google.com.vn, google.co.uk. `maps.` là tiền tố tùy chọn.
const GOOGLE_HOST = /^(?:www\.|maps\.)?google\.(?:com|[a-z]{2}|com\.[a-z]{2}|co\.[a-z]{2})$/;
const SCHEME_LESS_PREFIXES = ['www.', 'maps.', 'google.', 'maps.app.goo.gl/', 'goo.gl/'] as const;
// `!3d<lat>!4d<lng>` là tọa độ ghim của địa điểm; Google không công bố định dạng này nên `@` vẫn là dự phòng.
const PLACE_DATA = new RegExp(`!3d(${NUMBER})!4d(${NUMBER})`, 'g');
const PATH_COORDINATE = new RegExp(`^/maps/(?:place|search)/(${NUMBER})(?:,|%2C)(?:\\+|%20)?(${NUMBER})(?:/|$)`, 'i');
const VIEWPORT = new RegExp(`/@(${NUMBER}),(${NUMBER})(?:,[^/]*)?(?:/|$)`);
const QUERY_COORDINATE = new RegExp(`^(${NUMBER})\\s*,\\s*(${NUMBER})$`);
const PLACE_SEGMENT = /^\/maps\/place\/([^/]+)/;
const QUERY_KEYS: ReadonlySet<string> = new Set(['query', 'q', 'll', 'destination', 'center']);

type UrlParts = Readonly<{ host: string; path: string; query: string | null }>;

const isHighSurrogate = (code: number): boolean => code >= 0xd800 && code <= 0xdbff;

const stripControlCharacters = (value: string): string => {
  let result = '';

  for (let i = 0; i < value.length; i += 1) {
    const code = value.charCodeAt(i);

    if (code > 0x1f && code !== 0x7f) result += value[i];
  }

  return result;
};

// Không cắt giữa một cặp surrogate (emoji) để khỏi để lại nửa ký tự.
const truncate = (value: string, max: number): string => {
  if (value.length <= max) return value;

  const end = isHighSurrogate(value.charCodeAt(max - 1)) ? max - 1 : max;

  return value.slice(0, end).trimEnd();
};

const safeDecode = (value: string): string | null => {
  try {
    return decodeURIComponent(value);
  } catch {
    return null;
  }
};

const toCoordinateResult = (
  latitude: string | undefined,
  longitude: string | undefined,
  place: PlaceHint,
  source: LocationSource,
): LocationParse => {
  const coordinate = createWgs84Coordinate({ latitude: Number(latitude), longitude: Number(longitude) });

  return coordinate === null ? OUT_OF_RANGE : { kind: 'coordinate', coordinate, place, source };
};

const parseBareCoordinate = (text: string): LocationParse | null => {
  const match = BARE_COORDINATE.exec(text);

  return match === null ? null : toCoordinateResult(match[1], match[2], NO_PLACE, 'coordinates');
};

const splitUrl = (text: string): UrlParts | null => {
  const lower = text.toLowerCase();
  const normalized = SCHEME_LESS_PREFIXES.some((prefix) => lower.startsWith(prefix)) ? `https://${text}` : text;
  const match = URL_PARTS.exec(normalized);

  if (match === null || match[1] === undefined) return null;

  return { host: match[1].toLowerCase(), path: match[2] ?? '', query: match[3] ?? null };
};

const parseShortLink = ({ host, path, query }: UrlParts): LocationParse | null => {
  const isShort = host === 'maps.app.goo.gl' || (host === 'goo.gl' && path.startsWith('/maps/'));

  if (!isShort) return null;

  // Route resolve chỉ nhận https, nên link gõ `http://` được nâng lên https tại đây.
  return { kind: 'short-link', url: `https://${host}${path}${query === null ? '' : `?${query}`}` };
};

const isGoogleMapsUrl = ({ host, path }: UrlParts): boolean =>
  GOOGLE_HOST.test(host) && (host.startsWith('maps.') || path === '/maps' || path.startsWith('/maps/'));

// Tên địa điểm nằm ở `/maps/place/<tên, địa chỉ>/`: tên là phần trước dấu phẩy đầu tiên, phần còn lại gợi ý
// cho ô Địa chỉ (D-48, D-49). Đoạn là tọa độ thì không phải tên.
const parsePlaceHint = (path: string): PlaceHint => {
  const segment = PLACE_SEGMENT.exec(path)?.[1];

  if (segment === undefined) return NO_PLACE;

  const decoded = safeDecode(segment.replaceAll('+', ' '));

  if (decoded === null) return NO_PLACE;

  const text = stripControlCharacters(decoded).trim();

  if (text === '' || BARE_COORDINATE.test(text)) return NO_PLACE;

  const comma = text.indexOf(',');
  const name = truncate(comma === -1 ? text : text.slice(0, comma).trim(), MAX_NAME_LENGTH);
  const address = comma === -1 ? '' : truncate(text.slice(comma + 1).trim(), MAX_ADDRESS_LENGTH);

  return { name: name === '' ? null : name, address: address === '' ? null : address };
};

const parsePlaceData = ({ path, query }: UrlParts, place: PlaceHint): LocationParse | null => {
  const pairs = [...`${path}?${query ?? ''}`.matchAll(PLACE_DATA)];
  const last = pairs.at(-1);

  return last === undefined ? null : toCoordinateResult(last[1], last[2], place, 'place-data');
};

const parsePathCoordinate = ({ path }: UrlParts, place: PlaceHint): LocationParse | null => {
  const match = PATH_COORDINATE.exec(path);

  return match === null ? null : toCoordinateResult(match[1], match[2], place, 'path');
};

// Chỉ nhận khi giá trị là tọa độ: `query=Chợ` là tên nên không tính.
const parseQueryCoordinate = ({ query }: UrlParts, place: PlaceHint): LocationParse | null => {
  if (query === null) return null;

  for (const pair of query.split('&')) {
    const equals = pair.indexOf('=');

    if (equals <= 0 || !QUERY_KEYS.has(pair.slice(0, equals).toLowerCase())) continue;

    const decoded = safeDecode(pair.slice(equals + 1).replaceAll('+', ' '));
    const match = decoded === null ? null : QUERY_COORDINATE.exec(decoded.trim());

    if (match !== null) return toCoordinateResult(match[1], match[2], place, 'query');
  }

  return null;
};

// Tâm khung nhìn, ưu tiên thấp nhất.
const parseViewport = ({ path }: UrlParts, place: PlaceHint): LocationParse | null => {
  const match = VIEWPORT.exec(path);

  return match === null ? null : toCoordinateResult(match[1], match[2], place, 'viewport');
};

const parseLink = (text: string): LocationParse => {
  const parts = splitUrl(text);

  if (parts === null) return INVALID;

  const shortLink = parseShortLink(parts);

  if (shortLink !== null) return shortLink;
  if (!isGoogleMapsUrl(parts)) return INVALID;

  const place = parsePlaceHint(parts.path);

  return (
    parsePlaceData(parts, place) ??
    parsePathCoordinate(parts, place) ??
    parseQueryCoordinate(parts, place) ??
    parseViewport(parts, place) ?? { kind: 'no-coordinate', place }
  );
};

export function parseLocationInput(raw: string): LocationParse {
  const text = raw.trim();

  if (text === '') return EMPTY;

  return parseBareCoordinate(text) ?? parseLink(text);
}

export function isShortMapsLink(raw: string): boolean {
  return parseLocationInput(raw).kind === 'short-link';
}

// `toFixed` cho "-0.0000" với số âm rất nhỏ; hiển thị "0.0000" cho khỏi gây hiểu nhầm.
const toFixed4 = (value: number): string => {
  const fixed = value.toFixed(4);

  return fixed === '-0.0000' ? '0.0000' : fixed;
};

/** "10.7769, 106.7009": 4 chữ số thập phân, dấu chấm (UI-SPEC §Định dạng). */
export function formatCoordinate(c: Wgs84Coordinate): string {
  return `${toFixed4(c.latitude)}, ${toFixed4(c.longitude)}`;
}
