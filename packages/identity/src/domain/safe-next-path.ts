// Chống open redirect cho `?next=`. Giá trị này do người dùng (hoặc kẻ tấn công qua một đường link) kiểm soát
// rồi đi thẳng vào `router.replace` / `redirect`, nên chỉ nhận path nội bộ. Chỉ kiểm chuỗi, không dùng `URL`
// (React Native có `URL` không đầy đủ) và không đọc đồng hồ: domain dùng chung web + mobile.
// Trả `null` thay vì ném lỗi: `next` sai là chuyện bình thường, nơi gọi rơi về đích mặc định.
const MAX_LENGTH = 2048;

// Trình duyệt bỏ tab và xuống dòng khi parse URL, nên "/\t/evil.com" thành "//evil.com". Chặn mọi ký tự điều
// khiển và khoảng trắng thay vì liệt kê từng ký tự. Dùng mã ký tự thay vì regex để khỏi vướng `no-control-regex`.
const hasControlOrSpace = (value: string): boolean => {
  for (let i = 0; i < value.length; i += 1) {
    const code = value.charCodeAt(i);

    if (code <= 0x20 || code === 0x7f) return true;
  }

  return false;
};

// Chặn `/login` và `/register` để `?next=/login` không tạo vòng lặp chuyển trang (Pitfall 10): sau đăng nhập
// thành công mà `next` lại trỏ về trang đăng nhập thì proxy đẩy ngược trở lại. `/api` và `/_next` là route nội bộ
// của app, không phải trang người dùng muốn quay về. So khớp theo đoạn path nên `/loginfoo` vẫn hợp lệ.
const BLOCKED_ROOTS = ['/login', '/register', '/api', '/_next'] as const;

const isBlockedPathname = (pathname: string): boolean =>
  BLOCKED_ROOTS.some((root) => pathname === root || pathname.startsWith(`${root}/`));

/** Trả path nội bộ đã kiểm, hoặc `null` nếu `raw` không an toàn để điều hướng tới. */
export const toSafeNextPath = (raw: string | null | undefined): string | null => {
  if (typeof raw !== 'string') return null;
  if (raw.length === 0 || raw.length > MAX_LENGTH) return null;
  if (raw[0] !== '/') return null;
  // "//host" là URL cùng scheme (protocol-relative); "/\host" bị trình duyệt đổi `\` thành `/`.
  if (raw[1] === '/' || raw[1] === '\\') return null;
  if (raw.includes('\\')) return null;
  if (hasControlOrSpace(raw)) return null;

  const queryOrHash = raw.search(/[?#]/);
  const pathname = queryOrHash === -1 ? raw : raw.slice(0, queryOrHash);

  return isBlockedPathname(pathname) ? null : raw;
};
