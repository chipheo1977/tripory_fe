// Tải lịch trình cho trang công khai phía server (D-21, D-22). Hàm thuần theo `ServerDeps` để test được mà không cần
// `next/headers`; bộ bọc `server-only` + `React.cache` nằm ở `composition/itinerary.server.ts`.
//
// Gọi qua `callBackend` (không dùng `createFetchHttpClient`): URL bị khóa vào `API_ORIGIN` + `/api/v1/`, `redirect: "manual"`,
// timeout 28 giây tính cả đọc body, `cache: "no-store"`. KHÔNG log Bearer, URL hay body.
//
// Bẫy Bearer stale (04-BE-DEPENDENCIES mục 7, 04 D-46): BE coi Bearer hết hạn là ẩn danh và trả 403 cho chủ xem bản nháp
// của chính mình. Nên Bearer chỉ được gắn khi phiên còn tươi; 403 trong lúc phiên là `stale` thì báo `recover` để client
// refresh phiên rồi tải lại, không kết luận 403 ngay.
import type { Itinerary } from "@tripory/itinerary";
import { itineraryDetailDto, toItinerary } from "@tripory/itinerary/http";
import type { ItineraryId } from "@tripory/shared-kernel";
import { z } from "zod";
import type { ServerDeps } from "./env";
import type { SessionState } from "./session-store";
import { callBackend, isPassableUpstreamBody, type UpstreamResult } from "./upstream";

/** Envelope thành công của BE: `{ status: "success", data: ItineraryDetailDto }` (zod bỏ khóa thừa). */
const detailEnvelope = z.object({ status: z.literal("success"), data: itineraryDetailDto });

export type PublicItineraryResult =
  | Readonly<{ kind: "ok"; itinerary: Itinerary }>
  | Readonly<{ kind: "forbidden" }>
  | Readonly<{ kind: "not-found" }>
  | Readonly<{ kind: "recover" }>
  | Readonly<{ kind: "error" }>;

const FORBIDDEN: PublicItineraryResult = Object.freeze({ kind: "forbidden" });
const NOT_FOUND: PublicItineraryResult = Object.freeze({ kind: "not-found" });
const RECOVER: PublicItineraryResult = Object.freeze({ kind: "recover" });
const ERROR: PublicItineraryResult = Object.freeze({ kind: "error" });

type ResponseUpstream = Extract<UpstreamResult, { kind: "response" }>;
type Resolver = (upstream: ResponseUpstream, session: SessionState) => PublicItineraryResult;

function bearerHeaders(session: SessionState): Record<string, string> {
  if (session.state !== "fresh") return { accept: "application/json" };
  return { accept: "application/json", authorization: `Bearer ${session.accessToken}` };
}

/** 403 khi phiên `stale` có thể chỉ là Bearer hết hạn bị BE coi là ẩn danh: để client hồi phục phiên. */
function forbiddenResult(_upstream: ResponseUpstream, session: SessionState): PublicItineraryResult {
  return session.state === "stale" ? RECOVER : FORBIDDEN;
}

function okResult(upstream: ResponseUpstream): PublicItineraryResult {
  if (!isPassableUpstreamBody(upstream.contentType, upstream.body)) return ERROR;
  try {
    const parsed = detailEnvelope.parse(JSON.parse(upstream.body));
    return { kind: "ok", itinerary: toItinerary(parsed.data) };
  } catch {
    return ERROR;
  }
}

const RESOLVERS: Readonly<Record<number, Resolver>> = {
  200: okResult,
  403: forbiddenResult,
  404: () => NOT_FOUND,
};

export async function loadPublicItinerary(
  deps: ServerDeps,
  id: ItineraryId,
  session: SessionState,
): Promise<PublicItineraryResult> {
  const upstream = await callBackend(deps, `/api/v1/itineraries/${id}`, {
    method: "GET",
    headers: bearerHeaders(session),
  });
  if (upstream.kind !== "response") return ERROR;
  const resolve = RESOLVERS[upstream.status];
  if (resolve === undefined) return ERROR;
  return resolve(upstream, session);
}
