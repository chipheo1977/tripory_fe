import type { Wgs84Coordinate } from '@tripory/shared-kernel';
import {
  isPlaceAllowed,
  isSearchableCoordinate,
  PLACE_QUERY_MIN_LENGTH,
  placeQueryText,
  SUGGESTION_CATEGORIES,
  VIETNAM_SEARCH_BOUNDS,
} from '../domain';
import type { GeoBounds, LngLat, Place } from '../domain';
import type { PlaceReverseProvider, PlaceSearchProvider } from './ports';

// Lọc và gộp kết quả của nhà cung cấp theo luật domain (D-144..D-146). Chạy ở BFF; client chỉ thấy kết quả đã lọc.

const SEARCH_PROVIDER_LIMIT = 15;
const SEARCH_RESULT_LIMIT = 10;
const SUGGESTION_PROVIDER_LIMIT = 6;
const SUGGESTION_RESULT_LIMIT = 15;

export type PlaceSearchInput = Readonly<{ text: string; bias: LngLat | null }>;

export type PlaceSearchService = Readonly<{
  /** `[]` khi từ khóa sau chuẩn hóa ngắn hơn 2 ký tự, không gọi nhà cung cấp. */
  search(input: PlaceSearchInput, signal?: AbortSignal): Promise<readonly Place[]>;
  /** Gợi ý theo nhóm Tham quan, Ăn uống, Lưu trú trong `bounds`; chỉ ném lỗi khi mọi nhóm đều lỗi. */
  suggest(bounds: GeoBounds, signal?: AbortSignal): Promise<readonly Place[]>;
  /** `null` cho tọa độ ngoài VN hoặc thuộc Hoàng Sa/Trường Sa, không gọi nhà cung cấp nào. */
  reverse(coordinate: Wgs84Coordinate, signal?: AbortSignal): Promise<Place | null>;
}>;

export type PlaceSearchServiceDeps = Readonly<{
  provider: PlaceSearchProvider;
  reverseFallback: PlaceReverseProvider | null;
}>;

const uniqueById = (places: readonly Place[]): Place[] => {
  const seen = new Set<string>();
  return places.filter((place) => {
    if (seen.has(place.id)) return false;
    seen.add(place.id);
    return true;
  });
};

const isNamed = (place: Place): boolean => place.name !== null;

const allowedOrNull = (place: Place | null): Place | null => {
  if (place === null) return null;
  return isPlaceAllowed(place) ? place : null;
};

// Dự phòng không được làm hỏng kết quả chính: lỗi của nó bị nuốt (D-142).
const safeReverse = async (
  provider: PlaceReverseProvider,
  coordinate: Wgs84Coordinate,
  signal: AbortSignal | undefined,
): Promise<Place | null> => {
  try {
    return allowedOrNull(await provider.reverse(coordinate, signal));
  } catch {
    return null;
  }
};

const mergeReverse = (primary: Place | null, fallback: Place | null): Place | null => {
  if (primary === null) return fallback;
  if (fallback === null) return primary;
  return { ...primary, address: fallback.address, name: primary.name ?? fallback.name };
};

export function createPlaceSearchService({ provider, reverseFallback }: PlaceSearchServiceDeps): PlaceSearchService {
  return Object.freeze({
    async search({ text, bias }: PlaceSearchInput, signal?: AbortSignal) {
      const query = placeQueryText(text);
      if (query.length < PLACE_QUERY_MIN_LENGTH) return Object.freeze([]);

      const places = await provider.search(
        { text: query, bounds: VIETNAM_SEARCH_BOUNDS, bias, limit: SEARCH_PROVIDER_LIMIT },
        signal,
      );
      return Object.freeze(uniqueById(places.filter(isPlaceAllowed)).slice(0, SEARCH_RESULT_LIMIT));
    },

    async suggest(bounds: GeoBounds, signal?: AbortSignal) {
      const settled = await Promise.allSettled(
        SUGGESTION_CATEGORIES.map((category) =>
          provider.suggest({ bounds, category, limit: SUGGESTION_PROVIDER_LIMIT }, signal),
        ),
      );
      const failure = settled.find((result) => result.status === 'rejected');
      const groups = settled.flatMap((result) => (result.status === 'fulfilled' ? [result.value] : []));

      if (groups.length === 0 && failure !== undefined) throw failure.reason;

      const places = groups.flat().filter((place) => isNamed(place) && isPlaceAllowed(place));
      return Object.freeze(uniqueById(places).slice(0, SUGGESTION_RESULT_LIMIT));
    },

    async reverse(coordinate: Wgs84Coordinate, signal?: AbortSignal) {
      if (!isSearchableCoordinate(coordinate)) return null;

      const primary = allowedOrNull(await provider.reverse(coordinate, signal));
      const needsFallback = primary === null || primary.address === null;
      if (!needsFallback || reverseFallback === null) return primary;

      return mergeReverse(primary, await safeReverse(reverseFallback, coordinate, signal));
    },
  });
}
