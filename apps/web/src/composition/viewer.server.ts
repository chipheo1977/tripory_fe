// Nguồn Viewer/loại phiên phía server cho Server Component. Là file DUY NHẤT trong `composition` có
// `import "server-only"` (kiến trúc mục 9): logic thật nằm ở `server/session-store` và
// `server/dashboard-gate` để test được mà không cần `next/headers`.
//
// Không gọi BE: chỉ giải mã claim của cookie access. Không dùng cache dùng chung của Next (directive cache): dữ liệu phiên là riêng của từng
// người dùng, token sẽ nằm trong cache key dạng plain text. `React.cache` chỉ sống trong một request.
import "server-only";
import { cookies } from "next/headers";
import { cache } from "react";
import { readSession, readViewerFromCookie } from "./server/session-store";
import type { SessionKind } from "./server/dashboard-gate";
import { isSecureCookieEnv } from "./session-cookies";
import type { Viewer } from "@tripory/identity";

/**
 * Viewer để hiển thị (menu, avatar) hoặc `null` khi là khách. Kể cả khi access token đã hết hạn vẫn trả người
 * đang đăng nhập để header không nhấp nháy. CHỈ gọi từ Server Component nằm trong `<Suspense>`: với
 * `cacheComponents`, đọc `cookies()` ngoài Suspense làm hỏng prerender.
 */
export const getViewer = cache(async (): Promise<Viewer | null> => {
  const jar = await cookies();

  return readViewerFromCookie((name) => jar.get(name)?.value, isSecureCookieEnv());
});

/**
 * Loại phiên theo đồng hồ server. Gọi `cookies()` TRƯỚC `Date.now()`: với `cacheComponents`, đọc thời gian
 * trước khi chạm dữ liệu động bị cảnh báo hoặc ném lỗi lúc prerender. CHỈ gọi từ Server Component nằm trong
 * `<Suspense>`.
 */
export const getSessionKind = cache(async (): Promise<SessionKind> => {
  const jar = await cookies();
  const nowSec = Math.floor(Date.now() / 1000);

  return readSession((name) => jar.get(name)?.value, nowSec, isSecureCookieEnv()).state;
});
