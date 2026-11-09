import { describe, expect, it } from 'vitest';
import { POPULAR_GROUP_SIZE, type Destination } from './destination';
import { normalizeSearchText, popularDestinations, searchDestinations } from './destination-search';

const d = (
  slug: string,
  name: string,
  popularityRank: number | null,
  aliases: readonly string[],
): Destination => ({
  slug,
  name,
  officialName: name,
  kind: 'province',
  adminCode: '00',
  popularityRank,
  aliases,
  defaultCoverImageUrl: null,
  view: { center: [105.85, 21.03], bounds: [[105.28, 20.56], [106.03, 21.39]] },
});

const LIST: readonly Destination[] = [
  d('vn-da-nang', 'Đà Nẵng', 1, ['Quảng Nam', 'Hội An']),
  d('vn-ho-chi-minh', 'TP. Hồ Chí Minh', 2, ['Sài Gòn', 'Vũng Tàu', 'Bà Rịa – Vũng Tàu']),
  d('vn-ha-noi', 'Hà Nội', 3, []),
  d('vn-lam-dong', 'Lâm Đồng', 5, ['Đắk Nông', 'Đà Lạt', 'Mũi Né']),
  d('vn-quang-ngai', 'Quảng Ngãi', null, ['Kon Tum']),
  d('vn-quang-tri', 'Quảng Trị', null, ['Quảng Bình', 'Phong Nha']),
  d('vn-hue', 'Huế', 9, ['Thừa Thiên Huế']),
];

const slugsOf = (query: string, list: readonly Destination[] = LIST) =>
  searchDestinations(list, query).map((match) => match.destination.slug);

describe('normalizeSearchText', () => {
  it.each([
    ['Đà Lạt', 'da lat'],
    ['TP. Hồ Chí Minh', 'tp ho chi minh'],
    ['  DA   LAT ', 'da lat'],
    ['Bà Rịa – Vũng Tàu', 'ba ria vung tau'],
  ])('%s -> %s', (input, expected) => {
    expect(normalizeSearchText(input)).toBe(expected);
  });
});

describe('searchDestinations', () => {
  it.each(['da lat', 'Đà Lạt', 'DA LAT'])('"%s" ra Lâm Đồng qua alias Đà Lạt', (query) => {
    const result = searchDestinations(LIST, query);
    expect(result).toHaveLength(1);
    expect(result[0]?.destination.slug).toBe('vn-lam-dong');
    expect(result[0]?.matchedAlias).toBe('Đà Lạt');
  });

  it('tên khớp đứng trước alias khớp, không lặp mục', () => {
    const result = searchDestinations(LIST, 'quang');
    expect(result.map((match) => match.destination.slug)).toEqual([
      'vn-quang-ngai',
      'vn-quang-tri',
      'vn-da-nang',
    ]);
    expect(result.map((match) => match.matchedAlias)).toEqual([null, null, 'Quảng Nam']);
  });

  it('tên chứa từ khóa là mức 1, không có alias khớp', () => {
    const result = searchDestinations(LIST, 'ho chi');
    expect(result).toHaveLength(1);
    expect(result[0]?.destination.slug).toBe('vn-ho-chi-minh');
    expect(result[0]?.matchedAlias).toBeNull();
  });

  it('lấy alias đầu tiên khớp theo thứ tự khai báo', () => {
    const result = searchDestinations(LIST, 'vung tau');
    expect(result).toHaveLength(1);
    expect(result[0]?.matchedAlias).toBe('Vũng Tàu');
  });

  it('Huế khớp tên, Thừa Thiên Huế khớp alias', () => {
    const byName = searchDestinations(LIST, 'hue');
    expect(byName[0]?.destination.slug).toBe('vn-hue');
    expect(byName[0]?.matchedAlias).toBeNull();
    const byAlias = searchDestinations(LIST, 'thua thien');
    expect(byAlias[0]?.destination.slug).toBe('vn-hue');
    expect(byAlias[0]?.matchedAlias).toBe('Thừa Thiên Huế');
  });

  it.each(['', '   ', 'xyz'])('"%s" ra mảng rỗng', (query) => {
    expect(searchDestinations(LIST, query)).toEqual([]);
  });

  it('cùng mức: hạng nhỏ đứng trước, hạng null sau cùng', () => {
    const list = [d('a', 'Alpha', null, []), d('b', 'Beta', 4, []), d('c', 'Gamma', 2, [])];
    expect(slugsOf('a', list)).toEqual(['a', 'c', 'b']);
  });

  it('không sửa mảng đầu vào', () => {
    const before = [...LIST];
    searchDestinations(LIST, 'quang');
    popularDestinations(LIST, 3);
    expect(LIST).toEqual(before);
  });
});

describe('popularDestinations', () => {
  it('lấy theo hạng tăng dần và cắt theo size', () => {
    expect(popularDestinations(LIST, 3).map((item) => item.slug)).toEqual([
      'vn-da-nang',
      'vn-ho-chi-minh',
      'vn-ha-noi',
    ]);
  });

  it('size mặc định là 8 và bỏ mục không có hạng', () => {
    expect(POPULAR_GROUP_SIZE).toBe(8);
    expect(popularDestinations(LIST).map((item) => item.slug)).toEqual([
      'vn-da-nang',
      'vn-ho-chi-minh',
      'vn-ha-noi',
      'vn-lam-dong',
      'vn-hue',
    ]);
  });
});
