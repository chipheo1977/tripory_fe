// Tên file ảnh QR tải về (D-14): `tripory-{tiêu đề đã chuẩn hóa}.png`, hoặc `tripory-{id}.png` khi tiêu đề không còn ký tự dùng được.
// Slug chỉ gồm `[a-z0-9-]` nên tên file an toàn trên mọi hệ điều hành (T-05-31).
const PREFIX = "tripory-";
const MAX_SLUG_LENGTH = 60;

const trimDashes = (value: string): string => value.replace(/^-+|-+$/g, "");

function slugify(title: string): string {
  const ascii = title
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[đĐ]/g, "d")
    .toLowerCase();
  return trimDashes(trimDashes(ascii.replace(/[^a-z0-9]+/g, "-")).slice(0, MAX_SLUG_LENGTH));
}

export function qrFileName(title: string, itineraryId: string): string {
  const slug = slugify(title);
  if (slug === "") return `${PREFIX}${itineraryId}.png`;
  return `${PREFIX}${slug}.png`;
}
