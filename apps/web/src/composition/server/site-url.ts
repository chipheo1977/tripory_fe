// Gốc URL công khai của site (origin). Dùng cho `metadataBase`, `og:url` và URL ảnh OG tuyệt đối (D-18, D-19).
// Biến `PUBLIC_SITE_URL` chỉ đọc phía server, KHÔNG có tiền tố `NEXT_PUBLIC_`. Link chia sẻ ở client lấy
// `window.location.origin` (RESEARCH Pattern 5) nên không cần biến này.

export const DEFAULT_PUBLIC_SITE_URL = "https://triporyv1.vercel.app";

// `URL.hostname` giữ nguyên ngoặc vuông với IPv6.
const LOOPBACK_HOSTNAMES: ReadonlySet<string> = new Set(["localhost", "127.0.0.1", "[::1]"]);

const INVALID_MESSAGE =
  "PUBLIC_SITE_URL không hợp lệ: cần đúng một origin http(s), không kèm path, ví dụ https://tripory.example.com";

const hasOnlyOrigin = (url: URL): boolean =>
  url.pathname === "/" && url.search === "" && url.hash === "" && url.username === "" && url.password === "";

const isHttpProtocol = (url: URL): boolean => url.protocol === "http:" || url.protocol === "https:";

function parseOrigin(value: string, production: boolean): string {
  if (!URL.canParse(value)) throw new Error(INVALID_MESSAGE);
  const url = new URL(value);
  if (!isHttpProtocol(url) || !hasOnlyOrigin(url)) throw new Error(INVALID_MESSAGE);
  const secureEnough = url.protocol === "https:" || LOOPBACK_HOSTNAMES.has(url.hostname);
  if (production && !secureEnough) throw new Error(INVALID_MESSAGE);
  return url.origin;
}

/** Thiếu hoặc rỗng thì dùng mặc định; sai định dạng thì ném lỗi cấu hình (không chép giá trị vào thông báo). */
export function parsePublicSiteUrl(raw: Readonly<Record<string, string | undefined>>): string {
  const value = raw.PUBLIC_SITE_URL?.trim() ?? "";
  if (value === "") return DEFAULT_PUBLIC_SITE_URL;
  return parseOrigin(value, raw.NODE_ENV === "production");
}

/** Đọc `process.env` lúc gọi, không lúc import (build không cần biến). */
export function publicSiteUrl(): string {
  return parsePublicSiteUrl({
    PUBLIC_SITE_URL: process.env.PUBLIC_SITE_URL,
    NODE_ENV: process.env.NODE_ENV,
  });
}
