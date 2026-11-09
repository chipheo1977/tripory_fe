import type { DestinationCatalog } from '../application';
import type { Destination, DestinationKind, DestinationView, GeoBounds, LngLat } from '../domain';

type RawDestination = Readonly<{
  slug: string;
  name: string;
  officialName: string;
  kind: DestinationKind;
  adminCode: string;
  popularityRank: number | null;
  aliases: readonly string[];
}>;

const d = (
  slug: string,
  name: string,
  officialName: string,
  kind: DestinationKind,
  adminCode: string,
  popularityRank: number | null,
  aliases: readonly string[],
): RawDestination => ({ slug, name, officialName, kind, adminCode, popularityRank, aliases });

/**
 * 34 đơn vị cấp tỉnh sau sắp xếp 2025 (04-BE-CONTRACT.md mục 4, Phụ lục A, B).
 * Thứ tự mảng là thứ tự nhóm "Tất cả" (khai báo sẵn, không sắp lúc chạy vì `localeCompare('vi')` khác nhau giữa môi trường).
 */
const RAW_DESTINATIONS: readonly RawDestination[] = [
  d('vn-an-giang', 'An Giang', 'Tỉnh An Giang', 'province', '91', 7, ['Kiên Giang', 'Phú Quốc', 'Hà Tiên', 'Rạch Giá', 'Châu Đốc']),
  d('vn-bac-ninh', 'Bắc Ninh', 'Tỉnh Bắc Ninh', 'province', '24', null, ['Bắc Giang']),
  d('vn-ca-mau', 'Cà Mau', 'Tỉnh Cà Mau', 'province', '96', null, ['Bạc Liêu']),
  d('vn-cao-bang', 'Cao Bằng', 'Tỉnh Cao Bằng', 'province', '04', null, []),
  d('vn-can-tho', 'Cần Thơ', 'Thành phố Cần Thơ', 'municipality', '92', null, ['Sóc Trăng', 'Hậu Giang']),
  d('vn-da-nang', 'Đà Nẵng', 'Thành phố Đà Nẵng', 'municipality', '48', 1, ['Quảng Nam', 'Hội An']),
  d('vn-dak-lak', 'Đắk Lắk', 'Tỉnh Đắk Lắk', 'province', '66', null, ['Phú Yên', 'Buôn Ma Thuột', 'Tuy Hòa']),
  d('vn-dien-bien', 'Điện Biên', 'Tỉnh Điện Biên', 'province', '11', null, []),
  d('vn-dong-nai', 'Đồng Nai', 'Tỉnh Đồng Nai', 'province', '75', null, ['Bình Phước']),
  d('vn-dong-thap', 'Đồng Tháp', 'Tỉnh Đồng Tháp', 'province', '82', null, ['Tiền Giang', 'Mỹ Tho']),
  d('vn-gia-lai', 'Gia Lai', 'Tỉnh Gia Lai', 'province', '52', null, ['Bình Định', 'Quy Nhơn', 'Pleiku']),
  d('vn-ha-noi', 'Hà Nội', 'Thành phố Hà Nội', 'municipality', '01', 3, []),
  d('vn-ha-tinh', 'Hà Tĩnh', 'Tỉnh Hà Tĩnh', 'province', '42', null, []),
  d('vn-hai-phong', 'Hải Phòng', 'Thành phố Hải Phòng', 'municipality', '31', null, ['Hải Dương', 'Cát Bà']),
  d('vn-ho-chi-minh', 'TP. Hồ Chí Minh', 'Thành phố Hồ Chí Minh', 'municipality', '79', 2, ['Sài Gòn', 'HCM', 'Bình Dương', 'Bà Rịa – Vũng Tàu', 'Vũng Tàu', 'Côn Đảo']),
  d('vn-hue', 'Huế', 'Thành phố Huế', 'municipality', '46', 9, ['Thừa Thiên Huế']),
  d('vn-hung-yen', 'Hưng Yên', 'Tỉnh Hưng Yên', 'province', '33', null, ['Thái Bình']),
  d('vn-khanh-hoa', 'Khánh Hòa', 'Tỉnh Khánh Hòa', 'province', '56', 4, ['Ninh Thuận', 'Nha Trang', 'Phan Rang']),
  d('vn-lai-chau', 'Lai Châu', 'Tỉnh Lai Châu', 'province', '12', null, []),
  d('vn-lang-son', 'Lạng Sơn', 'Tỉnh Lạng Sơn', 'province', '20', null, []),
  d('vn-lao-cai', 'Lào Cai', 'Tỉnh Lào Cai', 'province', '15', 8, ['Yên Bái', 'Sa Pa', 'Mù Cang Chải']),
  d('vn-lam-dong', 'Lâm Đồng', 'Tỉnh Lâm Đồng', 'province', '68', 5, ['Đắk Nông', 'Bình Thuận', 'Đà Lạt', 'Mũi Né', 'Phan Thiết']),
  d('vn-nghe-an', 'Nghệ An', 'Tỉnh Nghệ An', 'province', '40', null, []),
  d('vn-ninh-binh', 'Ninh Bình', 'Tỉnh Ninh Bình', 'province', '37', 10, ['Hà Nam', 'Nam Định', 'Tràng An', 'Tam Cốc']),
  d('vn-phu-tho', 'Phú Thọ', 'Tỉnh Phú Thọ', 'province', '25', null, ['Vĩnh Phúc', 'Hòa Bình', 'Tam Đảo', 'Mai Châu']),
  d('vn-quang-ngai', 'Quảng Ngãi', 'Tỉnh Quảng Ngãi', 'province', '51', null, ['Kon Tum', 'Măng Đen', 'Lý Sơn']),
  d('vn-quang-ninh', 'Quảng Ninh', 'Tỉnh Quảng Ninh', 'province', '22', 6, ['Hạ Long']),
  d('vn-quang-tri', 'Quảng Trị', 'Tỉnh Quảng Trị', 'province', '44', null, ['Quảng Bình', 'Phong Nha', 'Đồng Hới']),
  d('vn-son-la', 'Sơn La', 'Tỉnh Sơn La', 'province', '14', null, ['Mộc Châu']),
  d('vn-tay-ninh', 'Tây Ninh', 'Tỉnh Tây Ninh', 'province', '80', null, ['Long An']),
  d('vn-thai-nguyen', 'Thái Nguyên', 'Tỉnh Thái Nguyên', 'province', '19', null, ['Bắc Kạn', 'Ba Bể']),
  d('vn-thanh-hoa', 'Thanh Hóa', 'Tỉnh Thanh Hóa', 'province', '38', null, ['Sầm Sơn']),
  d('vn-tuyen-quang', 'Tuyên Quang', 'Tỉnh Tuyên Quang', 'province', '08', null, ['Hà Giang', 'Đồng Văn', 'Mèo Vạc']),
  d('vn-vinh-long', 'Vĩnh Long', 'Tỉnh Vĩnh Long', 'province', '86', null, ['Bến Tre', 'Trà Vinh']),
];

const view = (center: LngLat, bounds: GeoBounds): DestinationView => ({ center, bounds });

// Tâm và khung nhìn xấp xỉ (D-121), suy từ ranh giới OSM admin_level=4 sau sắp xếp 2025, tra qua Photon ngày 2026-11-05.
// © OpenStreetMap contributors, ODbL. Khung là khung nhìn (làm tròn ra ngoài 2 chữ số, kẹp vào đất liền
// [[102.1, 8.3], [109.6, 23.4]]), không phải ranh giới hành chính; Khánh Hòa dùng khung tay để không gồm Trường Sa.
const DESTINATION_VIEWS: Readonly<Record<string, DestinationView>> = {
  'vn-an-giang': view([105.043, 10.319], [[103.05, 8.99], [105.58, 10.97]]), // OSM R1875748
  'vn-bac-ninh': view([106.201, 21.276], [[105.88, 20.96], [107.04, 21.63]]), // OSM R1902690
  'vn-ca-mau': view([105.087, 9.018], [[103.48, 8.3], [106.06, 9.64]]), // OSM R1873490
  'vn-cao-bang': view([106.106, 22.743], [[105.26, 22.35], [106.84, 23.12]]), // OSM R1844412
  'vn-can-tho': view([105.787, 10.036], [[105.22, 8.7], [106.46, 10.33]]), // OSM R1874283
  'vn-da-nang': view([108.212, 16.068], [[107.21, 14.95], [109.03, 16.34]]), // OSM R1891418
  'vn-dak-lak': view([108.798, 12.874], [[107.48, 12.16], [109.6, 13.7]]), // OSM R1884034
  'vn-dien-bien': view([103.217, 21.655], [[102.14, 20.89], [103.6, 22.55]]), // OSM R1903340
  'vn-dong-nai': view([107.112, 11.439], [[106.41, 10.57], [107.58, 12.3]]), // OSM R1904421
  'vn-dong-thap': view([105.927, 10.425], [[105.18, 10.13], [107, 10.98]]), // OSM R1875866
  'vn-gia-lai': view([108.635, 14.02], [[107.45, 12.99], [109.59, 14.71]]), // OSM R1884018
  'vn-ha-noi': view([105.854, 21.028], [[105.28, 20.56], [106.03, 21.39]]), // OSM R1903516
  'vn-ha-tinh': view([105.762, 18.35], [[105.1, 17.9], [106.76, 18.77]]), // OSM R1898458
  'vn-hai-phong': view([106.679, 20.883], [[106.12, 19.91], [107.96, 21.24]]), // OSM R1902682
  'vn-ho-chi-minh': view([106.717, 10.774], [[105.97, 8.34], [108.44, 11.51]]), // OSM R1973756
  'vn-hue': view([107.586, 16.464], [[107.03, 15.99], [108.49, 17.12]]), // OSM R1891483
  'vn-hung-yen': view([106.284, 20.607], [[105.89, 20.07], [107.12, 21.01]]), // OSM R1901032
  'vn-khanh-hoa': view([108.995, 12.298], [[108.55, 11.25], [109.47, 12.87]]), // OSM R1887959 (bbox tay, bỏ Trường Sa)
  'vn-lai-chau': view([103.18, 22.292], [[102.32, 21.68], [103.99, 22.82]]), // OSM R1903322
  'vn-lang-son': view([106.614, 21.849], [[106.09, 21.32], [107.37, 22.47]]), // OSM R5522596
  'vn-lao-cai': view([104.183, 22.307], [[103.52, 21.32], [105.11, 22.85]]), // OSM R1903400
  'vn-lam-dong': view([108.134, 11.661], [[107.2, 9.37], [109.41, 12.82]]), // OSM R1885367
  'vn-nghe-an': view([105.061, 19.198], [[103.87, 18.55], [106.27, 20.01]]), // OSM R1898509
  'vn-ninh-binh': view([106.1, 20.287], [[105.54, 19.41], [106.96, 20.71]]), // OSM R1900963
  'vn-phu-tho': view([105.135, 21.301], [[104.81, 20.3], [105.86, 21.72]]), // OSM R1902930
  'vn-quang-ngai': view([108.692, 14.995], [[107.33, 13.92], [109.47, 15.8]]), // OSM R1890793
  'vn-quang-ninh': view([107.076, 20.956], [[106.43, 20.46], [108.21, 21.67]]), // OSM R1902947
  'vn-quang-tri': view([106.955, 17.217], [[105.6, 16.3], [107.7, 18.14]]), // OSM R1895630
  'vn-son-la': view([104.158, 21.228], [[103.21, 20.57], [105.03, 22.04]]), // OSM R1903291
  'vn-tay-ninh': view([106.261, 11.08], [[105.5, 10.39], [106.75, 11.79]]), // OSM R1898961
  'vn-thai-nguyen': view([105.844, 21.961], [[105.43, 21.32], [106.25, 22.75]]), // OSM R1902967
  'vn-thanh-hoa': view([105.482, 19.978], [[104.37, 19.18], [106.27, 20.67]]), // OSM R1898590
  'vn-tuyen-quang': view([105.072, 22.338], [[104.33, 21.49], [105.6, 23.4]]), // OSM R1903418
  'vn-vinh-long': view([106.295, 10.047], [[105.68, 9.08], [107, 10.35]]), // OSM R1875887
};

const viewOf = (slug: string): DestinationView => {
  const found = DESTINATION_VIEWS[slug];
  if (found === undefined) throw new Error('Thiếu khung nhìn cho ' + slug);
  return found;
};

export type StaticDestinationCatalogOptions = Readonly<{
  /** Gốc URL ảnh mặc định, https tuyệt đối; khớp `DestinationCatalog:CoverImageBaseUrl` của BE. */
  imageBaseUrl: string;
}>;

const HTTPS_ABSOLUTE = /^https:\/\/[^\s]+$/;

const normalizeBase = (imageBaseUrl: string): string => {
  if (!HTTPS_ABSOLUTE.test(imageBaseUrl)) {
    throw new Error('imageBaseUrl phải là URL https tuyệt đối');
  }
  return imageBaseUrl.replace(/\/+$/, '');
};

export function createStaticDestinationCatalog({ imageBaseUrl }: StaticDestinationCatalogOptions): DestinationCatalog {
  const base = normalizeBase(imageBaseUrl);
  const destinations: readonly Destination[] = Object.freeze(
    RAW_DESTINATIONS.map((raw) =>
      Object.freeze({
        ...raw,
        aliases: Object.freeze([...raw.aliases]),
        defaultCoverImageUrl: `${base}/${raw.slug}.jpg`,
        view: viewOf(raw.slug),
      }),
    ),
  );
  const bySlug = new Map(destinations.map((destination) => [destination.slug, destination]));

  return {
    list: () => destinations,
    findBySlug: (slug) => {
      if (slug === null) return null;
      return bySlug.get(slug) ?? null;
    },
  };
}
