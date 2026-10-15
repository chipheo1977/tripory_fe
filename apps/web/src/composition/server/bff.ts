// BFF `/api/bff/[...path]`: lớp duy nhất đứng giữa trình duyệt và BE cho REST (AUTH-08). Hàm thuần, không
// `server-only` để test được bằng vitest. Không log gì ở đây: header có Bearer, body có dữ liệu người dùng.

/**
 * Allowlist gốc đường dẫn. Đây là điều kiện để BFF không thành open proxy: client chỉ chạm được các nhóm
 * endpoint này của BE. `auth/*` cố ý KHÔNG có ở đây: token chỉ đi qua `/api/auth/*` (route riêng ghi cookie),
 * nên `auth/login` qua BFF rơi vào 404.
 */
export const BFF_ALLOWED_ROOTS: ReadonlySet<string> = new Set(["users", "itineraries", "chat"]);

/** BE chỉ dùng 4 verb này. */
export const BFF_ALLOWED_METHODS: ReadonlySet<string> = new Set(["GET", "POST", "PUT", "DELETE"]);

export type BffTarget = Readonly<{ ok: true; path: string }> | Readonly<{ ok: false; status: 400 | 404 }>;

// Dạng mã hóa của `/`, `\` và `.`. Next giải mã segment trước khi đưa vào handler nên `%2e%2e` đến tay ta
// đã thành `..`, nhưng `%2F` có thể thành segment chứa `/`. Kiểm trên chuỗi THÔ để không lệ thuộc vào cách
// giải mã của Next hay của BE phía sau.
const ENCODED_TRAVERSAL = /%2f|%5c|%2e/i;
const UNSAFE_SEGMENT_CHARS = /[/\\\u0000-\u001f]/;

/**
 * Chuyển segment của catch-all thành path upstream `/api/v1/...`.
 *
 * Thứ tự: dạng mã hóa trên chuỗi thô, rồi từng segment (rỗng, `.`, `..`, `/`, `\`, ký tự điều khiển), cuối
 * cùng mới xét gốc allowlist. Nhờ vậy traversal luôn nhận 400 kể cả khi gốc là `users`, còn gốc ngoài
 * allowlist với segment sạch nhận 404. Segment được `encodeURIComponent` lại, upstream không bao giờ nhận
 * ký tự điều khiển path.
 */
export function resolveBffTarget(segments: readonly string[], rawPathname: string): BffTarget {
  if (ENCODED_TRAVERSAL.test(rawPathname)) return { ok: false, status: 400 };

  for (const segment of segments) {
    if (segment === "" || segment === "." || segment === ".." || UNSAFE_SEGMENT_CHARS.test(segment)) {
      return { ok: false, status: 400 };
    }
  }

  const root = segments[0];

  if (root === undefined || !BFF_ALLOWED_ROOTS.has(root)) return { ok: false, status: 404 };

  return { ok: true, path: `/api/v1/${segments.map(encodeURIComponent).join("/")}` };
}
