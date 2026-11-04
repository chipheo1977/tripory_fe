import type { DestinationCatalog } from '../application';
import type { Destination, DestinationKind } from '../domain';

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
