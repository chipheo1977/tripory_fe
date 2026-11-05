// Luật kiểm link ảnh bìa dùng chung, khớp BE (04-BE-CONTRACT mục 7): URL tuyệt đối, scheme https, có host,
// không khoảng trắng hay ký tự điều khiển, độ dài đo trên chuỗi đã trim. Hàm thuần, không React.

export const COVER_URL_MAX_LENGTH = 500;

// Host phải đứng ngay sau https:// (WHATWG bỏ qua dấu / thừa nên https:///a parse được nhưng không có host thật).
const HOST_FOLLOWS = /^https:\/\/[^/?#\\]/i;
const FORBIDDEN_CHARS = /[\s\u0000-\u001f\u007f]/;

/** Chỉ `https:` có host, không khoảng trắng/ký tự điều khiển: chặn `javascript:`, `http:`, `data:`. Không xét độ dài. */
export const isHttpsUrl = (value: string): boolean => {
  if (value === '' || FORBIDDEN_CHARS.test(value) || !HOST_FOLLOWS.test(value)) return false;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && url.hostname !== '';
  } catch {
    return false;
  }
};

/** Link ảnh bìa hợp lệ như BE chấp nhận: đã trim, https có host, ≤ 500 ký tự. */
export const isValidCoverUrl = (raw: string): boolean => {
  const trimmed = raw.trim();
  return trimmed.length <= COVER_URL_MAX_LENGTH && isHttpsUrl(trimmed);
};

/** URL dùng để xem trước: bản đã trim khi hợp lệ, ngược lại chuỗi rỗng. */
export const previewableCoverUrl = (raw: string): string => {
  if (!isValidCoverUrl(raw)) return '';
  return raw.trim();
};
