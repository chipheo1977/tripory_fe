// Metadata Open Graph + noindex của trang công khai `/itineraries/[id]` (PUB-05, D-18..D-20). Hàm thuần để test được.
//
// - Chỉ nhánh `ok` có thẻ OG (tiêu đề, mô tả, ảnh của lịch trình). Mọi nhánh khác (403, 404, hồi phục phiên, lỗi) và id sai
//   dạng đều trung tính: tiêu đề "Lịch trình" kết hợp template thành "Lịch trình · Tripory", không có OG, nên không lộ
//   tiêu đề, mô tả hay ảnh của bản nháp (T-05-19).
// - `noindex, nofollow` ở MỌI nhánh (D-20): trong đợt thử với bạn bè chỉ ai có link mới xem. `noindex` không chặn crawler
//   xem trước link của Zalo/Messenger đọc thẻ OG.
// - KHÔNG dùng file-based `opengraph-image`: nó có độ ưu tiên cao hơn `generateMetadata` và sẽ ghi đè ảnh bìa (docs
//   generate-metadata.md). Ảnh mặc định là route `/og-default.png`.
// - `og:type = website` (RESEARCH A4): `article` đòi thêm thẻ không có nghĩa ở đây.
import type { Itinerary } from "@tripory/itinerary";
import { buildDayRange } from "@tripory/itinerary";
import type { Metadata } from "next";
import type { PublicItineraryResult } from "./public-itinerary";

const NEUTRAL_TITLE = "Lịch trình";
const SITE_NAME = "Tripory";
const OG_DEFAULT_PATH = "/og-default.png";
const OG_WIDTH = 1200;
const OG_HEIGHT = 630;
const DESCRIPTION_LIMIT = 160;
const WORD_BREAK_WINDOW = 20;
const ROBOTS = { index: false, follow: false } as const;

export type OgImage = Readonly<{ url: string; alt: string; width?: number; height?: number }>;

function truncate(text: string): string {
  if (text.length <= DESCRIPTION_LIMIT) return text;
  const cut = text.slice(0, DESCRIPTION_LIMIT);
  const lastSpace = cut.lastIndexOf(" ");
  const atWord = lastSpace >= DESCRIPTION_LIMIT - WORD_BREAK_WINDOW ? cut.slice(0, lastSpace) : cut;
  return `${atWord.trimEnd()}…`;
}

/** Mô tả OG (D-19): chuẩn hóa khoảng trắng, cắt ~160 ký tự kèm "…"; trống thì "Lịch trình N ngày · X điểm trên Tripory". */
export function ogDescription(itinerary: Itinerary): string {
  const text = (itinerary.description ?? "").replace(/\s+/g, " ").trim();
  if (text === "") {
    return `Lịch trình ${buildDayRange(itinerary).length} ngày · ${itinerary.waypoints.length} điểm trên Tripory`;
  }
  return truncate(text);
}

function isUserCover(coverImageUrl: string | null, destinationImageBaseUrl: string): coverImageUrl is string {
  if (coverImageUrl === null) return false;
  if (!coverImageUrl.startsWith("https://")) return false;
  return !coverImageUrl.startsWith(`${destinationImageBaseUrl}/`);
}

/**
 * Ảnh OG (D-18): ảnh bìa do người dùng tự thêm; ảnh mặc định theo điểm đến (còn là ảnh giữ chỗ, có thể 404) hoặc không có
 * ảnh thì dùng ảnh OG mặc định của Tripory 1200×630. Nhận biết ảnh mặc định theo điểm đến bằng tiền tố URL.
 */
export function chooseOgImage(coverImageUrl: string | null, siteUrl: string, destinationImageBaseUrl: string): OgImage {
  if (isUserCover(coverImageUrl, destinationImageBaseUrl)) return { url: coverImageUrl, alt: SITE_NAME };
  return { url: `${siteUrl}${OG_DEFAULT_PATH}`, width: OG_WIDTH, height: OG_HEIGHT, alt: SITE_NAME };
}

export function neutralPublicMetadata(siteUrl: string): Metadata {
  return { title: NEUTRAL_TITLE, robots: ROBOTS, metadataBase: new URL(siteUrl) };
}

type BuildInput = Readonly<{
  result: PublicItineraryResult;
  id: string;
  siteUrl: string;
  destinationImageBaseUrl: string;
}>;

export function buildPublicMetadata({ result, id, siteUrl, destinationImageBaseUrl }: BuildInput): Metadata {
  if (result.kind !== "ok") return neutralPublicMetadata(siteUrl);
  const { itinerary } = result;
  const description = ogDescription(itinerary);
  const image = chooseOgImage(itinerary.coverImageUrl, siteUrl, destinationImageBaseUrl);
  return {
    title: itinerary.title,
    description,
    robots: ROBOTS,
    metadataBase: new URL(siteUrl),
    openGraph: {
      title: itinerary.title,
      description,
      url: `${siteUrl}/itineraries/${id}`,
      type: "website",
      siteName: SITE_NAME,
      locale: "vi_VN",
      images: [image],
    },
    twitter: {
      card: "summary_large_image",
      title: itinerary.title,
      description,
      images: [image.url],
    },
  };
}
