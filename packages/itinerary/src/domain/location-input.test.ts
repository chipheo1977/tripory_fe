import { describe, expect, it } from 'vitest';
import {
  formatCoordinate,
  isShortMapsLink,
  parseLocationInput,
  type LocationParse,
  type LocationSource,
} from './location-input';

const coordinateOf = (
  latitude: number,
  longitude: number,
  source: LocationSource,
  name: string | null = null,
  address: string | null = null,
): LocationParse => ({ kind: 'coordinate', coordinate: { latitude, longitude }, place: { name, address }, source });

const NO_PLACE = { name: null, address: null } as const;

describe('parseLocationInput: tọa độ trần', () => {
  it.each([
    ['10.7769, 106.7009', 10.7769, 106.7009],
    ['10.7769,106.7009', 10.7769, 106.7009],
    ['  10.7769 ,  106.7009  ', 10.7769, 106.7009],
    ['-33.8,151.2', -33.8, 151.2],
    ['0,0', 0, 0],
    ['90, 180', 90, 180],
    ['-90,-180', -90, -180],
  ] as const)('nhận %j', (raw, latitude, longitude) => {
    expect(parseLocationInput(raw)).toEqual(coordinateOf(latitude, longitude, 'coordinates'));
  });

  it.each([['91, 10'], ['-91, 10'], ['10, 181'], ['10.7769, 200']] as const)('ngoài khoảng: %j', (raw) => {
    expect(parseLocationInput(raw)).toEqual({ kind: 'out-of-range' });
  });

  it.each([[''], ['   '], ['\n\t']] as const)('rỗng: %j', (raw) => {
    expect(parseLocationInput(raw)).toEqual({ kind: 'empty' });
  });

  it.each([
    ['10,7769 106,7009', 'dấu phẩy thập phân kiểu Việt'],
    ['10.7769', 'thiếu kinh độ'],
    ['10.7769, 106.7009, 15', 'thừa phần tử'],
    ['abc, def', 'không phải số'],
    ['hello', 'chuỗi tự do'],
    ['javascript:alert(1)', 'scheme lạ'],
    ['ftp://www.google.com/maps/@10,10,15z', 'scheme không hỗ trợ'],
  ] as const)('không hợp lệ: %j (%s)', (raw) => {
    expect(parseLocationInput(raw)).toEqual({ kind: 'invalid' });
  });
});

describe('parseLocationInput: link rút gọn', () => {
  it.each([
    ['https://maps.app.goo.gl/PJdcARfqULFnpENj7', 'https://maps.app.goo.gl/PJdcARfqULFnpENj7'],
    ['maps.app.goo.gl/PJdcARfqULFnpENj7', 'https://maps.app.goo.gl/PJdcARfqULFnpENj7'],
    ['http://maps.app.goo.gl/abc', 'https://maps.app.goo.gl/abc'],
    ['https://MAPS.APP.GOO.GL/abc', 'https://maps.app.goo.gl/abc'],
    ['https://goo.gl/maps/abc123', 'https://goo.gl/maps/abc123'],
    ['goo.gl/maps/abc123', 'https://goo.gl/maps/abc123'],
    ['  https://maps.app.goo.gl/abc?g_st=ic  ', 'https://maps.app.goo.gl/abc?g_st=ic'],
  ] as const)('%j là short-link', (raw, url) => {
    expect(parseLocationInput(raw)).toEqual({ kind: 'short-link', url });
    expect(isShortMapsLink(raw)).toBe(true);
  });

  it.each([
    ['https://goo.gl/abc', 'goo.gl không thuộc /maps/'],
    ['goo.gl/abc', 'không scheme, goo.gl không thuộc /maps/'],
    ['https://goo.gl/maps', 'thiếu id sau /maps/'],
    ['https://maps.app.goo.gl.evil.com/abc', 'host giả'],
    ['https://evilmaps.app.goo.gl/abc', 'host con lạ'],
    ['https://bit.ly/abc', 'dịch vụ rút gọn khác'],
  ] as const)('không phải short-link: %j (%s)', (raw) => {
    expect(parseLocationInput(raw)).toEqual({ kind: 'invalid' });
    expect(isShortMapsLink(raw)).toBe(false);
  });

  it('isShortMapsLink false với tọa độ và link đầy đủ', () => {
    expect(isShortMapsLink('10.7769, 106.7009')).toBe(false);
    expect(isShortMapsLink('https://www.google.com/maps/@10.7769,106.7009,15z')).toBe(false);
    expect(isShortMapsLink('')).toBe(false);
  });
});

describe('parseLocationInput: link Google Maps đầy đủ', () => {
  it('ưu tiên !3d!4d hơn @ (tọa độ ghim, không phải tâm khung nhìn)', () => {
    const url =
      'https://www.google.com/maps/place/Ch%E1%BB%A3+B%E1%BA%BFn+Th%C3%A0nh/@10.77,106.69,17z/data=!3m1!4b1!4m6!3m5!1s0x0:0x0!8m2!3d10.7725!4d106.698!16s';

    expect(parseLocationInput(url)).toEqual(coordinateOf(10.7725, 106.698, 'place-data', 'Chợ Bến Thành', null));
  });

  it('lấy cặp !3d!4d CUỐI khi có nhiều cặp', () => {
    const url = 'https://www.google.com/maps/place/X/data=!3d1!4d2!4m2!3d10.5!4d106.5';

    expect(parseLocationInput(url)).toEqual(coordinateOf(10.5, 106.5, 'place-data', 'X', null));
  });

  it('!3d ngoài khoảng → out-of-range', () => {
    expect(parseLocationInput('https://www.google.com/maps/place/X/data=!3d95!4d10')).toEqual({ kind: 'out-of-range' });
  });

  it('đọc tọa độ trong path /maps/search/<lat>,+<lng> (link thật đã resolve 2026-10-24)', () => {
    expect(parseLocationInput('https://www.google.com/maps/search/29.996966,+68.748251?entry=tts')).toEqual(
      coordinateOf(29.996966, 68.748251, 'path'),
    );
  });

  it.each([
    ['https://www.google.com/maps/search/10.7769,106.7009', 10.7769, 106.7009],
    ['https://www.google.com/maps/search/10.7769,%2010.5', 10.7769, 10.5],
    ['https://www.google.com/maps/place/10.7769,+106.7009', 10.7769, 106.7009],
    ['https://www.google.com/maps/place/10.7769,106.7009/@10.7,106.6,17z', 10.7769, 106.7009],
    ['https://www.google.com/maps/search/-33.8688,+151.2093/', -33.8688, 151.2093],
  ] as const)('path: %j', (url, latitude, longitude) => {
    expect(parseLocationInput(url)).toEqual(coordinateOf(latitude, longitude, 'path'));
  });

  it('path ngoài khoảng → out-of-range', () => {
    expect(parseLocationInput('https://www.google.com/maps/search/95,10')).toEqual({ kind: 'out-of-range' });
  });

  it.each([
    ['https://www.google.com/maps/search/?api=1&query=47.5951518%2C-122.3316393', 47.5951518, -122.3316393],
    ['https://maps.google.com/?q=10.77,106.70', 10.77, 106.7],
    ['https://maps.google.com/?q=10.77,+106.70', 10.77, 106.7],
    ['https://www.google.com/maps?ll=10.77,106.70&z=15', 10.77, 106.7],
    ['https://www.google.com/maps/dir/?api=1&destination=10.77%2C106.70', 10.77, 106.7],
    ['https://www.google.com/maps/@?api=1&map_action=map&center=10.77,106.70', 10.77, 106.7],
    ['https://www.google.com/maps?q=Cho+Ben+Thanh&ll=10.77,106.70', 10.77, 106.7],
  ] as const)('query: %j', (url, latitude, longitude) => {
    expect(parseLocationInput(url)).toEqual(coordinateOf(latitude, longitude, 'query'));
  });

  it('query ngoài khoảng → out-of-range', () => {
    expect(parseLocationInput('https://maps.google.com/?q=10,200')).toEqual({ kind: 'out-of-range' });
  });

  it('query là tên địa điểm thì không có tọa độ', () => {
    expect(parseLocationInput('https://www.google.com/maps/search/?api=1&query=Ch%E1%BB%A3')).toEqual({
      kind: 'no-coordinate',
      place: NO_PLACE,
    });
  });

  it.each([
    ['https://www.google.com/maps/@10.7769,106.7009,15z', 10.7769, 106.7009],
    ['https://www.google.com/maps/@10.7769,106.7009', 10.7769, 106.7009],
    ['https://www.google.com/maps/@-33.8688,151.2093,12.5z/data=!3m1', -33.8688, 151.2093],
  ] as const)('viewport: %j', (url, latitude, longitude) => {
    expect(parseLocationInput(url)).toEqual(coordinateOf(latitude, longitude, 'viewport'));
  });

  it('viewport ngoài khoảng → out-of-range', () => {
    expect(parseLocationInput('https://www.google.com/maps/@91,10,15z')).toEqual({ kind: 'out-of-range' });
  });

  it.each([
    ['www.google.com/maps/@10.7769,106.7009,15z'],
    ['google.com/maps/@10.7769,106.7009,15z'],
    ['maps.google.com/?q=10.7769,106.7009'],
    ['https://www.google.com.vn/maps/@10.7769,106.7009,15z'],
    ['https://www.google.co.uk/maps/@10.7769,106.7009,15z'],
    ['https://maps.google.com.vn/?ll=10.7769,106.7009'],
    ['https://www.google.de/maps/@10.7769,106.7009,15z'],
    ['HTTPS://WWW.GOOGLE.COM/maps/@10.7769,106.7009,15z'],
  ] as const)('nhận host Google (kể cả không scheme, tên miền quốc gia): %j', (raw) => {
    expect(parseLocationInput(raw)).toMatchObject({ kind: 'coordinate', coordinate: { latitude: 10.7769, longitude: 106.7009 } });
  });

  it.each([
    ['https://evil.com/maps/@10,10,15z', 'host lạ có path /maps'],
    ['https://www.google.com@evil.com/maps/@10,10,15z', 'userinfo giả host'],
    ['https://google.com.evil.com/maps/@10,10,15z', 'host Google là tiền tố'],
    ['https://notgoogle.com/maps/@10,10,15z', 'host chứa google ở cuối'],
    ['https://www.google.com.evil.com/maps/@10,10,15z', 'host con giả'],
    ['https://www.google.com/search?q=10.77,106.70', 'host Google nhưng không phải Maps'],
    ['https://www.google.com/mapsfoo/@10,10,15z', 'path /mapsfoo không phải /maps'],
    ['https://www.google.com:8080/maps/@10,10,15z', 'có cổng'],
    ['https://evil.com/?q=https://www.google.com/maps/@10,10,15z', 'Google chỉ nằm trong query'],
  ] as const)('từ chối: %j (%s)', (raw) => {
    expect(parseLocationInput(raw)).toEqual({ kind: 'invalid' });
  });

  it('nhận host maps.* kể cả path không bắt đầu /maps', () => {
    expect(parseLocationInput('https://maps.google.com/place?ll=10.5,106.5')).toEqual(coordinateOf(10.5, 106.5, 'query'));
  });

  it('URL Google Maps hợp lệ nhưng không có tọa độ → no-coordinate', () => {
    expect(parseLocationInput('https://www.google.com/maps')).toEqual({ kind: 'no-coordinate', place: NO_PLACE });
    expect(parseLocationInput('https://maps.google.com/')).toEqual({ kind: 'no-coordinate', place: NO_PLACE });
  });
});

describe('parseLocationInput: tên và địa chỉ gợi ý (D-48, D-49)', () => {
  it('link thật maps.app.goo.gl/PJdcARfqULFnpENj7 đã resolve: no-coordinate, tách tên và địa chỉ', () => {
    const url =
      'https://www.google.com/maps/place/Brandenburg+Gate,+Pariser+Platz,+10117+Berlin,+Germany/data=!4m2!3m1!1s0x47a851c655f20989:0x26bbfb4e84674c63';

    expect(parseLocationInput(url)).toEqual({
      kind: 'no-coordinate',
      place: { name: 'Brandenburg Gate', address: 'Pariser Platz, 10117 Berlin, Germany' },
    });
  });

  it('không có dấu phẩy: chỉ có tên, địa chỉ null', () => {
    expect(parseLocationInput('https://www.google.com/maps/place/Ben+Thanh/')).toEqual({
      kind: 'no-coordinate',
      place: { name: 'Ben Thanh', address: null },
    });
  });

  it('giải mã UTF-8 phần trăm', () => {
    expect(parseLocationInput('https://www.google.com/maps/place/Ch%E1%BB%A3+B%E1%BA%BFn+Th%C3%A0nh')).toEqual({
      kind: 'no-coordinate',
      place: { name: 'Chợ Bến Thành', address: null },
    });
  });

  it('%2B giữ nguyên dấu cộng, chỉ "+" trần mới thành khoảng trắng', () => {
    expect(parseLocationInput('https://www.google.com/maps/place/C%2B%2B+Cafe')).toEqual({
      kind: 'no-coordinate',
      place: { name: 'C++ Cafe', address: null },
    });
  });

  it('địa chỉ rỗng sau dấu phẩy → null', () => {
    expect(parseLocationInput('https://www.google.com/maps/place/Ben+Thanh,+/')).toEqual({
      kind: 'no-coordinate',
      place: { name: 'Ben Thanh', address: null },
    });
  });

  it('tách tại dấu phẩy ĐẦU TIÊN', () => {
    expect(parseLocationInput('https://www.google.com/maps/place/A,+B,+C,+D/')).toEqual({
      kind: 'no-coordinate',
      place: { name: 'A', address: 'B, C, D' },
    });
  });

  it('đoạn place là tọa độ thì không lấy làm tên', () => {
    expect(parseLocationInput('https://www.google.com/maps/place/10.7769,+106.7009/data=!4m2')).toEqual(
      coordinateOf(10.7769, 106.7009, 'path'),
    );
  });

  it('chuỗi % hỏng không ném lỗi, bỏ tên (T-04-15)', () => {
    const broken = 'https://www.google.com/maps/place/%E0%A4%A/data=!4m2';

    expect(() => parseLocationInput(broken)).not.toThrow();
    expect(parseLocationInput(broken)).toEqual({ kind: 'no-coordinate', place: NO_PLACE });
  });

  it('% hỏng trong link có tọa độ vẫn trả tọa độ, tên null', () => {
    expect(parseLocationInput('https://www.google.com/maps/place/%E0%A4%A/data=!3d10.5!4d106.5')).toEqual(
      coordinateOf(10.5, 106.5, 'place-data'),
    );
  });

  it('% hỏng trong query không ném lỗi', () => {
    const broken = 'https://www.google.com/maps?q=%E0%A4%A';

    expect(() => parseLocationInput(broken)).not.toThrow();
    expect(parseLocationInput(broken)).toEqual({ kind: 'no-coordinate', place: NO_PLACE });
  });

  it('bỏ ký tự điều khiển (<= 0x1f và 0x7f) khỏi tên và địa chỉ (T-04-14)', () => {
    const url = 'https://www.google.com/maps/place/Ho%0AChi%09Minh,+%07Viet%7Fnam/data=!4m2';

    expect(parseLocationInput(url)).toEqual({
      kind: 'no-coordinate',
      place: { name: 'HoChiMinh', address: 'Vietnam' },
    });
  });

  it('cắt tên còn 200 ký tự và địa chỉ còn 500 ký tự (T-04-14)', () => {
    const url = `https://www.google.com/maps/place/${'a'.repeat(300)},+${'b'.repeat(600)}/data=!4m2`;
    const result = parseLocationInput(url);

    expect(result.kind).toBe('no-coordinate');
    if (result.kind !== 'no-coordinate') return;
    expect(result.place.name).toBe('a'.repeat(200));
    expect(result.place.address).toBe('b'.repeat(500));
  });

  it('không để lại nửa cặp surrogate khi cắt giữa ký tự emoji', () => {
    const url = `https://www.google.com/maps/place/${'a'.repeat(199)}%F0%9F%98%80/data=!4m2`;
    const result = parseLocationInput(url);

    expect(result.kind).toBe('no-coordinate');
    if (result.kind !== 'no-coordinate') return;
    expect(result.place.name).toBe('a'.repeat(199));
  });
});

describe('formatCoordinate', () => {
  it.each([
    [{ latitude: 10.77691, longitude: 106.70089 }, '10.7769, 106.7009'],
    [{ latitude: -33.86882, longitude: 151.20929 }, '-33.8688, 151.2093'],
    [{ latitude: 10, longitude: 106 }, '10.0000, 106.0000'],
    [{ latitude: -0.00001, longitude: 0 }, '0.0000, 0.0000'],
  ] as const)('%j → %j', (coordinate, expected) => {
    expect(formatCoordinate(coordinate)).toBe(expected);
  });

  it('kết quả parse lại được thành đúng tọa độ', () => {
    expect(parseLocationInput(formatCoordinate({ latitude: 10.77691, longitude: 106.70089 }))).toEqual(
      coordinateOf(10.7769, 106.7009, 'coordinates'),
    );
  });
});
