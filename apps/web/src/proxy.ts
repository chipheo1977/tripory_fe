// Gate lạc quan cho nhóm route `(dashboard)` và đẩy người đã đăng nhập khỏi trang auth (D-04, D-09, D-10).
//
// Proxy CHỈ là tối ưu trải nghiệm: nó nhìn sự có mặt của cookie phiên, không giải mã JWT, không gọi BE, không
// đụng refresh token. Cookie giả vượt được proxy nhưng không vượt được BFF và BE (hai nơi này xác thực Bearer
// thật), và layout `(dashboard)` có một lưới an toàn thứ hai (plan 03-13). Đừng bao giờ coi proxy là lớp phân
// quyền.
//
// Cố ý KHÔNG redirect khi access token đã hết hạn mà cookie vẫn còn (D-25): người dùng reload sau khi token
// hết hạn phải được giữ phiên, việc phục hồi do client (refresh im lặng) đảm nhiệm. Chỉ khi không còn cookie
// phiên mới đưa về /login.
import { toSafeNextPath } from "@tripory/identity";
import { NextResponse, type NextRequest } from "next/server";
import { hasSessionCookie, isSecureCookieEnv } from "@/composition/session-cookies";

/**
 * Tiền tố URL cần phiên. Proxy không thấy tên route group `(dashboard)` nên danh sách này phải khai báo tay;
 * test `proxy-coverage` ở plan 03-14 đối chiếu với thư mục `(dashboard)` để route mới quên khai báo làm CI
 * đỏ. Đó là cách hiện thực D-10 "route mới tự được bảo vệ".
 */
export const PROTECTED_PREFIXES = ["/itineraries/mine", "/settings"] as const;

const AUTH_PAGES = new Set(["/login", "/register"]);
const DEFAULT_AFTER_LOGIN = "/itineraries/mine";

const isProtected = (pathname: string): boolean =>
  PROTECTED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));

/** Tham số nội bộ của Next (RSC/prefetch) không được lọt vào `?next=` (Pitfall 8). */
const isInternalParam = (name: string): boolean => name === "_rsc" || name.startsWith("__next");

function pathWithPublicSearch(pathname: string, searchParams: URLSearchParams): string {
  const kept = new URLSearchParams();

  for (const [name, value] of searchParams) {
    if (!isInternalParam(name)) kept.append(name, value);
  }

  const query = kept.toString();

  return query === "" ? pathname : `${pathname}?${query}`;
}

export function proxy(request: NextRequest): NextResponse {
  const { pathname, searchParams } = request.nextUrl;
  const signedIn = hasSessionCookie(request.cookies, isSecureCookieEnv());

  if (AUTH_PAGES.has(pathname)) {
    if (!signedIn) return NextResponse.next();

    // D-04: đã đăng nhập thì rời trang auth; `next` đi qua toSafeNextPath nên không thể là open redirect.
    const target = toSafeNextPath(searchParams.get("next")) ?? DEFAULT_AFTER_LOGIN;

    return NextResponse.redirect(new URL(target, request.url));
  }

  if (!signedIn && isProtected(pathname)) {
    const login = new URL("/login", request.url);

    login.searchParams.set("next", pathWithPublicSearch(pathname, searchParams));

    return NextResponse.redirect(login);
  }

  return NextResponse.next();
}

// `matcher` phải là hằng số để Next phân tích lúc build (biến và template bị bỏ qua).
export const config = {
  matcher: ["/((?!api/|_next/static|_next/image|favicon.ico|icon.svg|.*\\.[a-zA-Z0-9]+$).*)"],
};
