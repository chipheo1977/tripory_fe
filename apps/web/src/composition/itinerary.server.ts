// Lấy lịch trình cho trang công khai phía server. Cùng `viewer.server.ts`, đây là file `*.server.ts` duy nhất của loader có
// `import "server-only"` (kiến trúc mục 9); logic thật ở `server/public-itinerary.ts` để test được.
//
// `React.cache` theo `id` để `generateMetadata` và page chỉ gọi BE một lần mỗi request. KHÔNG dùng cache dùng chung của Next
// (directive cache): dữ liệu theo người xem (nháp chỉ chủ xem), Bearer sẽ nằm trong key (PITFALLS P5). CHỈ gọi trong
// `<Suspense>` hoặc `generateMetadata`: với `cacheComponents`, đọc `cookies()` ngoài Suspense làm hỏng prerender.
import "server-only";
import type { ItineraryId } from "@tripory/shared-kernel";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { cache } from "react";
import { serverDeps } from "./server/env";
import { loadPublicItinerary, type PublicItineraryResult } from "./server/public-itinerary";
import { readSession } from "./server/session-store";
import { isSecureCookieEnv } from "./session-cookies";

export type { PublicItineraryResult };

export const getPublicItinerary = cache(async (id: ItineraryId): Promise<PublicItineraryResult> => {
  const jar = await cookies();
  // Cùng thứ tự với `getSessionKind`: `cookies()` rồi `connection()` rồi mới `Date.now()`.
  await connection();
  const nowSec = Math.floor(Date.now() / 1000);
  const session = readSession((name) => jar.get(name)?.value, nowSec, isSecureCookieEnv());
  return loadPublicItinerary(serverDeps(), id, session);
});
