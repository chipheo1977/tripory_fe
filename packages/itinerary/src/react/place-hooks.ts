import { keepPreviousData, useQuery } from '@tanstack/react-query';
import type { Wgs84Coordinate } from '@tripory/shared-kernel';
import type { PlaceLookup } from '../application';
import { PLACE_QUERY_MIN_LENGTH, placeQueryText } from '../domain';
import type { Place } from '../domain';

// Hook tìm địa điểm (MAP-01, D-151): factory riêng nhận `PlaceLookup` (BFF `/api/places/*`), tách khỏi
// `createItineraryHooks` để các mock của hook itinerary không phải đổi. Không có lệnh ghi: chỉ là query đọc.

const SEARCH_STALE_MS = 5 * 60 * 1000;
const SUGGESTION_STALE_MS = 60 * 60 * 1000;
const REVERSE_STALE_MS = 60 * 60 * 1000;

const round5 = (value: number): number => Math.round(value * 1e5) / 1e5;

export const placeKeys = {
  all: ['place'] as const,
  search: (destinationCode: string | null, text: string) => ['place', 'search', destinationCode, text] as const,
  suggestions: (destinationCode: string | null) => ['place', 'suggestions', destinationCode] as const,
  reverse: (coordinate: Wgs84Coordinate | null) =>
    ['place', 'reverse', round5(coordinate?.latitude ?? 0), round5(coordinate?.longitude ?? 0)] as const,
};

export function createPlaceHooks(lookup: PlaceLookup) {
  return {
    /** Chỉ chạy khi từ khóa đã chuẩn hóa có từ 2 ký tự; giữ kết quả cũ trong lúc tải từ khóa mới. */
    usePlaceSearch: (text: string, destinationCode: string | null) => {
      const query = placeQueryText(text);
      return useQuery<readonly Place[]>({
        queryKey: placeKeys.search(destinationCode, query),
        queryFn: ({ signal }) => lookup.search({ text: query, destinationCode }, signal),
        enabled: query.length >= PLACE_QUERY_MIN_LENGTH,
        staleTime: SEARCH_STALE_MS,
        placeholderData: keepPreviousData,
      });
    },

    /** Gợi ý theo điểm đến (D-146); lịch trình không có điểm đến thì không gọi. */
    usePlaceSuggestions: (destinationCode: string | null) =>
      useQuery<readonly Place[]>({
        queryKey: placeKeys.suggestions(destinationCode),
        queryFn: ({ signal }) => lookup.suggest(destinationCode ?? '', signal),
        enabled: destinationCode !== null,
        staleTime: SUGGESTION_STALE_MS,
      }),

    /** Địa chỉ cho một tọa độ nhập tay; `null` = không gọi. */
    useReversePlace: (coordinate: Wgs84Coordinate | null) =>
      useQuery<Place | null>({
        queryKey: placeKeys.reverse(coordinate),
        queryFn: ({ signal }) => (coordinate === null ? Promise.resolve(null) : lookup.reverse(coordinate, signal)),
        enabled: coordinate !== null,
        staleTime: REVERSE_STALE_MS,
      }),
  };
}

export type PlaceHooks = ReturnType<typeof createPlaceHooks>;
