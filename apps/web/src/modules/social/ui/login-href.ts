// đường dẫn đăng nhập của khách cho nút tim và khung mời bình luận, cùng cách dựng của `GuestLoginButton` (D-08, D-14).
// đăng nhập xong quay lại đúng trang kể cả `?view`, không tự like. `toSafeNextPath` chặn open redirect.
import { toSafeNextPath } from "@tripory/identity";

export function buildLoginHref(pathname: string, search: string): string {
  const query = search.startsWith("?") ? search.slice(1) : search;
  const withSearch = query === "" ? pathname : `${pathname}?${query}`;
  const next = toSafeNextPath(withSearch);
  return next === null ? "/login" : `/login?next=${encodeURIComponent(next)}`;
}
