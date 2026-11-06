// Route Handler `GET /api/places/{search,suggestions,reverse}` (D-143) dưới dạng hàm thuần
// `(NextRequest, PlacesDeps) => NextResponse`. BFF đầy đủ để không thành open proxy hay nguồn tiêu quota:
// method → Origin → phiên tươi → giới hạn theo người dùng → kiểm tham số → cache → service. Upstream cố định từ
// env (không nhận URL từ client), không chuyển cookie/header của người dùng, không log từ khóa hay tọa độ.
import { SESSION_EXPIRED } from "@tripory/api-client";
import { placeQueryText, PLACE_QUERY_MIN_LENGTH } from "@tripory/itinerary";
import type { DestinationCatalog, Place, PlaceSearchService } from "@tripory/itinerary";
import { createWgs84Coordinate } from "@tripory/shared-kernel";
import type { NextRequest, NextResponse } from "next/server";
import type { WindowLimiter } from "@/lib/in-memory/rate-limit";
import type { TtlCache } from "@/lib/in-memory/ttl-cache";
import type { ServerDeps } from "./env";
import { checkSameOrigin, errorEnvelope, successEnvelope } from "./request-guards";
import { readSession } from "./session-store";

export type PlacesDeps = Readonly<{
  server: ServerDeps;
  service: PlaceSearchService;
  cache: TtlCache<unknown>;
  limiter: WindowLimiter;
  destinations: DestinationCatalog;
}>;

const MINUTE_MS = 60_000;
const SEARCH_TTL_MS = 10 * MINUTE_MS;
const SUGGESTIONS_TTL_MS = 24 * 60 * MINUTE_MS;
const REVERSE_TTL_MS = 24 * 60 * MINUTE_MS;
/** Reverse không có địa chỉ (có thể vì cổng Nominatim vừa bỏ qua fallback): cache ngắn để lần sau thử lại. */
const REVERSE_NO_ADDRESS_TTL_MS = MINUTE_MS;
/** Trần độ dài từ khóa thô; dài hơn thì 400 thay vì lặng lẽ cắt. */
const MAX_RAW_QUERY_LENGTH = 200;
const COORDINATE_DECIMALS = 1e5;

type Guarded = Readonly<{ response: NextResponse }> | Readonly<{ response: null; nowMs: number }>;

/**
 * Chặn chung cho ba route. Phiên không tươi (`stale`/`invalid`) trả 401 `session.expired` và KHÔNG xóa cookie:
 * client refresh rồi phát lại request. Giới hạn đếm cả lần trúng cache (30 lần / 60 giây / người, chung ba route).
 */
function guard(request: NextRequest, deps: PlacesDeps): Guarded {
  const nowMs = deps.server.nowMs();

  if (request.method !== "GET") return { response: errorEnvelope(405, "Bff.MethodNotAllowed", nowMs) };
  if (!checkSameOrigin(request, deps.server.env.appOrigins)) {
    return { response: errorEnvelope(403, "Bff.CrossOrigin", nowMs) };
  }

  const session = readSession(
    (name) => request.cookies.get(name)?.value,
    Math.floor(nowMs / 1000),
    deps.server.secure,
  );

  if (session.state === "none") return { response: errorEnvelope(401, "Auth.Unauthorized", nowMs) };
  if (session.state !== "fresh") return { response: errorEnvelope(401, SESSION_EXPIRED, nowMs) };

  const limit = deps.limiter.hit(session.claims.userId, nowMs);

  if (!limit.ok) {
    const response = errorEnvelope(429, "Places.RateLimited", nowMs);

    response.headers.set("retry-after", String(limit.retryAfterSec));

    return { response };
  }

  return { response: null, nowMs };
}

/** Trúng cache thì không gọi service. Lỗi service thành 502 và KHÔNG được cache. */
async function cachedResponse<T>(
  deps: PlacesDeps,
  nowMs: number,
  cache: Readonly<{ key: string; ttlMs: number | ((data: T) => number) }>,
  load: () => Promise<T>,
): Promise<NextResponse> {
  const hit = deps.cache.get(cache.key);

  if (hit !== undefined) return successEnvelope(hit, nowMs);

  try {
    const data = await load();
    const ttlMs = typeof cache.ttlMs === "function" ? cache.ttlMs(data) : cache.ttlMs;

    deps.cache.set(cache.key, data, ttlMs);

    return successEnvelope(data, nowMs);
  } catch {
    return errorEnvelope(502, "Places.Unavailable", nowMs);
  }
}

const invalidQuery = (nowMs: number) => errorEnvelope(400, "Bff.InvalidQuery", nowMs);

const paramOf = (request: NextRequest, name: string): string | null => request.nextUrl.searchParams.get(name);

/** `GET /api/places/search?q=&destination=` → `{ places }`. `destination` tùy chọn, có thì phải là slug đã biết. */
export async function handlePlacesSearch(request: NextRequest, deps: PlacesDeps): Promise<NextResponse> {
  const guarded = guard(request, deps);

  if (guarded.response !== null) return guarded.response;

  const { nowMs } = guarded;
  const raw = paramOf(request, "q") ?? "";
  const text = placeQueryText(raw);

  if (raw.length > MAX_RAW_QUERY_LENGTH || text.length < PLACE_QUERY_MIN_LENGTH) return invalidQuery(nowMs);

  const slug = paramOf(request, "destination") ?? "";
  const destination = deps.destinations.findBySlug(slug === "" ? null : slug);

  if (slug !== "" && destination === null) return invalidQuery(nowMs);

  const key = `s:${destination?.slug ?? "-"}:${text.toLowerCase()}`;
  const bias = destination?.view.center ?? null;

  return cachedResponse(deps, nowMs, { key, ttlMs: SEARCH_TTL_MS }, async () => ({
    places: await deps.service.search({ text, bias }, request.signal),
  }));
}

/** `GET /api/places/suggestions?destination=` → `{ places }`. `destination` bắt buộc và phải là slug đã biết. */
export async function handlePlacesSuggestions(request: NextRequest, deps: PlacesDeps): Promise<NextResponse> {
  const guarded = guard(request, deps);

  if (guarded.response !== null) return guarded.response;

  const { nowMs } = guarded;
  const destination = deps.destinations.findBySlug(paramOf(request, "destination"));

  if (destination === null) return invalidQuery(nowMs);

  return cachedResponse(deps, nowMs, { key: `g:${destination.slug}`, ttlMs: SUGGESTIONS_TTL_MS }, async () => ({
    places: await deps.service.suggest(destination.view.bounds, request.signal),
  }));
}

function reverseTtlOf({ place }: Readonly<{ place: Place | null }>): number {
  if (place === null) return REVERSE_NO_ADDRESS_TTL_MS;
  if (place.address === null) return REVERSE_NO_ADDRESS_TTL_MS;

  return REVERSE_TTL_MS;
}

const roundCoordinate = (value: number): number => Math.round(value * COORDINATE_DECIMALS) / COORDINATE_DECIMALS;

const numberParam = (request: NextRequest, name: string): number => {
  const raw = paramOf(request, name)?.trim() ?? "";

  return raw === "" ? Number.NaN : Number(raw);
};

/**
 * `GET /api/places/reverse?lat=&lng=` → `{ place }` (`null` khi không có địa chỉ, ngoài VN hoặc thuộc Hoàng Sa/
 * Trường Sa). Tọa độ làm tròn 5 chữ số (~1 m) trước khi gọi và trong khóa cache.
 */
export async function handlePlacesReverse(request: NextRequest, deps: PlacesDeps): Promise<NextResponse> {
  const guarded = guard(request, deps);

  if (guarded.response !== null) return guarded.response;

  const { nowMs } = guarded;
  const coordinate = createWgs84Coordinate({
    latitude: roundCoordinate(numberParam(request, "lat")),
    longitude: roundCoordinate(numberParam(request, "lng")),
  });

  if (coordinate === null) return invalidQuery(nowMs);

  const key = `r:${coordinate.latitude},${coordinate.longitude}`;

  return cachedResponse(deps, nowMs, { key, ttlMs: reverseTtlOf }, async () => ({
    place: await deps.service.reverse(coordinate, request.signal),
  }));
}
