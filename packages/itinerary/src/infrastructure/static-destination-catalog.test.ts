import { describe, expect, it } from 'vitest';
import { boundsContain, normalizeSearchText, popularDestinations, searchDestinations } from '../domain';
import type { GeoBounds } from '../domain';
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

  describe('khung nhìn 34 tỉnh (D-121)', () => {
    const LAND_FRAME: GeoBounds = [
      [102.1, 8.3],
      [109.6, 23.4],
    ];

    it('34 slug đều có view', () => {
      expect(list.filter((item) => item.view !== undefined)).toHaveLength(34);
    });

    it.each(list.map((item) => [item.slug, item] as const))('%s: bbox trong khung đất liền và chứa tâm', (_slug, item) => {
      const [[west, south], [east, north]] = item.view.bounds;

      expect(west).toBeGreaterThanOrEqual(LAND_FRAME[0][0]);
      expect(south).toBeGreaterThanOrEqual(LAND_FRAME[0][1]);
      expect(east).toBeLessThanOrEqual(LAND_FRAME[1][0]);
      expect(north).toBeLessThanOrEqual(LAND_FRAME[1][1]);
      expect(boundsContain(item.view.bounds, item.view.center)).toBe(true);
    });

    it.each([
      ['Phú Quốc', [103.96, 10.23], 'vn-an-giang'],
      ['Đà Lạt', [108.44, 11.94], 'vn-lam-dong'],
      ['Phan Thiết', [108.1, 10.93], 'vn-lam-dong'],
      ['Hội An', [108.33, 15.88], 'vn-da-nang'],
      ['Vũng Tàu', [107.08, 10.35], 'vn-ho-chi-minh'],
      ['Sa Pa', [103.84, 22.34], 'vn-lao-cai'],
      ['Hà Giang', [104.98, 22.82], 'vn-tuyen-quang'],
      ['Nha Trang', [109.19, 12.24], 'vn-khanh-hoa'],
      ['Phan Rang', [108.99, 11.56], 'vn-khanh-hoa'],
      ['Quy Nhơn', [109.22, 13.78], 'vn-gia-lai'],
      ['Hạ Long', [107.08, 20.95], 'vn-quang-ninh'],
    ] as const)('địa danh %s nằm trong bbox của %s', (_place, point, slug) => {
      const view = catalog.findBySlug(slug)?.view;

      expect(view).toBeDefined();
      expect(boundsContain(view?.bounds ?? LAND_FRAME, [point[0], point[1]])).toBe(true);
    });

    it('Khánh Hòa dùng khung tay, không gồm Trường Sa', () => {
      expect(catalog.findBySlug('vn-khanh-hoa')?.view.bounds).toEqual([
        [108.55, 11.25],
        [109.47, 12.87],
      ]);
    });
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
