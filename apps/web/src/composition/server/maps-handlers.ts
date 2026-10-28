// Route Handler `/api/maps/resolve` (D-20) dưới dạng hàm thuần `(NextRequest, ServerDeps) => NextResponse`.
// Mở link rút gọn Google Maps phía server vì trình duyệt không đọc được `Location` cross-origin. Phải đóng
// vai BFF đầy đủ để không thành open proxy: method → Origin → phiên → body → resolve (SSRF chặn trong
// `maps-resolve.ts`). Không log: link người dùng dán có thể chứa vị trí riêng.
import { SESSION_EXPIRED } from "@tripory/api-client";
import type { NextRequest, NextResponse } from "next/server";
import type { ServerDeps } from "./env";
import { pickStrings, readJsonObject } from "./json-body";
import { resolveShortMapsLink } from "./maps-resolve";
import { checkSameOrigin, errorEnvelope, successEnvelope } from "./request-guards";
import { readSession } from "./session-store";

/** Cùng trần với `resolveShortMapsLink`; chặn sớm để body khổng lồ không đi tiếp. */
const MAX_URL_LENGTH = 2_048;

/**
 * `POST /api/maps/resolve { url }` → `{ url }` là URL Google Maps đích.
 *
 * Phiên không tươi (`stale`/`invalid`) trả 401 `session.expired` và KHÔNG xóa cookie: client refresh rồi phát
 * lại request; xóa ở đây sẽ cắt mất refresh token mà bước refresh cần. Server không gửi cookie hay header của
 * người dùng tới Google (resolver chỉ gửi `accept`).
 */
export async function handleMapsResolve(request: NextRequest, deps: ServerDeps): Promise<NextResponse> {
  const nowMs = deps.nowMs();

  if (request.method !== "POST") return errorEnvelope(405, "Bff.MethodNotAllowed", nowMs);
  if (!checkSameOrigin(request, deps.env.appOrigin)) return errorEnvelope(403, "Bff.CrossOrigin", nowMs);

  const session = readSession(
    (name) => request.cookies.get(name)?.value,
    Math.floor(nowMs / 1000),
    deps.secure,
  );

  if (session.state === "none") return errorEnvelope(401, "Auth.Unauthorized", nowMs);
  if (session.state !== "fresh") return errorEnvelope(401, SESSION_EXPIRED, nowMs);

  const picked = pickStrings(await readJsonObject(request), ["url"]);
  const url = picked?.url;

  if (url === undefined || url.length > MAX_URL_LENGTH) return errorEnvelope(400, "Bff.InvalidBody", nowMs);

  const result = await resolveShortMapsLink({ fetch: deps.fetch }, url);

  return result.ok
    ? successEnvelope({ url: result.url }, nowMs)
    : errorEnvelope(422, "Maps.UnresolvableLink", nowMs);
}
