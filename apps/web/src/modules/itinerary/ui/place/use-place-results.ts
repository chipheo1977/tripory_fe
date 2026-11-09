"use client";

// Dữ liệu của danh sách tìm địa điểm: từ khóa debounce 300 ms → tìm (≥ 2 ký tự) hoặc gợi ý theo điểm đến → trạng thái
// hiển thị. Gọi BFF qua hook của composition (`places.client`), không fetch trong component (luật D).
import { places } from "@/composition/places.client";
import { isSearchQuery, placeListState, type PlaceListState, type PlaceQuerySlice } from "./place-list-state";
import { useDebouncedValue } from "./use-debounced-value";

export const PLACE_SEARCH_DEBOUNCE_MS = 300;

export type PlaceResults = Readonly<{
  state: PlaceListState;
  /** Query đang hiện đang tải (kể cả tải lại khi còn giữ kết quả cũ): để ô tìm hiện spinner. */
  loading: boolean;
  /** Tải lại query đang hiện ("Thử lại"). */
  retry(): void;
}>;

type QueryLike = Readonly<{ data: PlaceQuerySlice["data"]; isFetching: boolean; error: unknown }>;

const sliceOf = (query: QueryLike): PlaceQuerySlice => ({
  data: query.data,
  loading: query.isFetching,
  error: query.error,
});

/**
 * `destinationName` `null` nghĩa là lịch trình không có điểm đến hoặc mã lạ: không gọi gợi ý và tìm không thiên
 * theo điểm đến (D-146). Xóa từ khóa xuống dưới 2 ký tự thì quay về gợi ý ngay, không chờ debounce.
 */
export function usePlaceResults(query: string, destinationCode: string | null, destinationName: string | null): PlaceResults {
  const knownCode = destinationName === null ? null : destinationCode;
  const debounced = useDebouncedValue(query, PLACE_SEARCH_DEBOUNCE_MS);
  const effective = isSearchQuery(query) ? debounced : query;
  const search = places.usePlaceSearch(effective, knownCode);
  const suggestions = places.usePlaceSuggestions(knownCode);
  const shown = isSearchQuery(effective) ? search : suggestions;
  const state = placeListState({
    query: effective,
    destinationName,
    search: sliceOf(search),
    suggestions: sliceOf(suggestions),
  });
  return {
    state,
    loading: shown.isFetching,
    retry: () => {
      void shown.refetch();
    },
  };
}
