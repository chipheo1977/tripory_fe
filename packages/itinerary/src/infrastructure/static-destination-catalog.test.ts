import { describe, expect, it } from 'vitest';
import { normalizeSearchText, popularDestinations, searchDestinations } from '../domain';
import { createStaticDestinationCatalog } from './static-destination-catalog';

const BASE = 'https://example.test/destinations';
const catalog = createStaticDestinationCatalog({ imageBaseUrl: BASE });
const list = catalog.list();

const ALL_NAMES = [
  'An Giang',
  'Bắc Ninh',
  'Cà Mau',
  'Cao Bằng',
  'Cần Thơ',
  'Đà Nẵng',
  'Đắk Lắk',
  'Điện Biên',
  'Đồng Nai',
  'Đồng Tháp',
  'Gia Lai',
  'Hà Nội',
  'Hà Tĩnh',
  'Hải Phòng',
  'TP. Hồ Chí Minh',
  'Huế',
  'Hưng Yên',
  'Khánh Hòa',
  'Lai Châu',
  'Lạng Sơn',
  'Lào Cai',
  'Lâm Đồng',
  'Nghệ An',
  'Ninh Bình',
  'Phú Thọ',
  'Quảng Ngãi',
  'Quảng Ninh',
  'Quảng Trị',
  'Sơn La',
  'Tây Ninh',
  'Thái Nguyên',
  'Thanh Hóa',
  'Tuyên Quang',
  'Vĩnh Long',
];

describe('static destination catalog', () => {
  it('có đúng 34 điểm đến với slug duy nhất dạng vn-*', () => {
    expect(list).toHaveLength(34);
    const slugs = list.map((destination) => destination.slug);
    expect(new Set(slugs).size).toBe(34);
    expect(slugs.every((slug) => /^vn-[a-z]+(-[a-z]+)*$/.test(slug))).toBe(true);
  });

  it('6 thành phố và 28 tỉnh, mã hành chính duy nhất', () => {
    expect(list.filter((item) => item.kind === 'municipality')).toHaveLength(6);
    expect(list.filter((item) => item.kind === 'province')).toHaveLength(28);
    expect(new Set(list.map((item) => item.adminCode)).size).toBe(34);
  });

  it('khóa thứ tự nhóm "Tất cả"', () => {
    expect(list.map((item) => item.name)).toEqual(ALL_NAMES);
  });

  it('nhóm "Phổ biến" đúng 8 mục theo hạng, hạng 9 và 10 là Huế và Ninh Bình', () => {
    expect(popularDestinations(list, 8).map((item) => item.name)).toEqual([
      'Đà Nẵng',
      'TP. Hồ Chí Minh',
      'Hà Nội',
      'Khánh Hòa',
      'Lâm Đồng',
      'Quảng Ninh',
      'An Giang',
      'Lào Cai',
    ]);
    expect(list.find((item) => item.popularityRank === 9)?.name).toBe('Huế');
    expect(list.find((item) => item.popularityRank === 10)?.name).toBe('Ninh Bình');
  });

  it('ảnh mặc định là https tuyệt đối theo slug', () => {
    expect(catalog.findBySlug('vn-da-nang')?.defaultCoverImageUrl).toBe(`${BASE}/vn-da-nang.jpg`);
    expect(list.every((item) => item.defaultCoverImageUrl?.startsWith('https://'))).toBe(true);
  });

  it('findBySlug trả điểm đến, mã lạ hoặc null trả null', () => {
    expect(catalog.findBySlug('vn-lam-dong')?.aliases).toContain('Đà Lạt');
    expect(catalog.findBySlug('vn-khong-co')).toBeNull();
    expect(catalog.findBySlug(null)).toBeNull();
  });

  it('không alias nào trùng tên của một đơn vị khác', () => {
    for (const destination of list) {
      for (const alias of destination.aliases) {
        const clash = list.find(
          (other) => other.slug !== destination.slug && normalizeSearchText(other.name) === normalizeSearchText(alias),
        );
        expect(clash, `${alias} trùng tên ${clash?.name}`).toBeUndefined();
      }
    }
  });

  it('tìm không dấu theo alias', () => {
    const daLat = searchDestinations(list, 'da lat')[0];
    expect(daLat?.destination.slug).toBe('vn-lam-dong');
    expect(daLat?.matchedAlias).toBe('Đà Lạt');
    expect(searchDestinations(list, 'phu quoc')[0]?.destination.slug).toBe('vn-an-giang');
  });

  it('imageBaseUrl không hợp lệ thì ném lỗi', () => {
    expect(() => createStaticDestinationCatalog({ imageBaseUrl: 'http://x' })).toThrow();
    expect(() => createStaticDestinationCatalog({ imageBaseUrl: '/destinations' })).toThrow();
  });

  it('gốc có dấu / cuối cho cùng URL, không có //', () => {
    const withSlash = createStaticDestinationCatalog({ imageBaseUrl: `${BASE}/` });
    expect(withSlash.findBySlug('vn-hue')?.defaultCoverImageUrl).toBe(`${BASE}/vn-hue.jpg`);
  });
});
