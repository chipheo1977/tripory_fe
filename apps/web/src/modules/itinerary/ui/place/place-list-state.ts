// Trạng thái danh sách của ô tìm địa điểm (D-146, D-150, D-153): gợi ý theo điểm đến khi từ khóa < 2 ký tự, kết quả
// tìm kiếm khi ≥ 2 ký tự, kèm copy cho loading/empty/hint/error. Hàm thuần: component chỉ hiển thị kết quả.
import { isApiError } from "@tripory/api-client";
import { PLACE_QUERY_MIN_LENGTH, placeQueryText, type Place } from "@tripory/itinerary";
import { ERROR_MESSAGES } from "@/lib/feedback";

export const PLACE_HINT = "Gõ tên địa điểm để tìm.";
export const PLACE_LOADING = "Đang tìm…";
export const PLACE_RESULTS_HEADING = "Kết quả tìm kiếm";
export const PLACE_ERROR = "Chưa tìm được địa điểm lúc này. Thử lại hoặc nhập tọa độ thủ công.";

export type PlaceListStatus = "hint" | "loading" | "ready" | "empty" | "error";

/** Phần cần của một query: dữ liệu (có thể là dữ liệu cũ giữ tạm), đang tải, lỗi. */
export type PlaceQuerySlice = Readonly<{ data: readonly Place[] | undefined; loading: boolean; error: unknown }>;

export type PlaceListState = Readonly<{
  status: PlaceListStatus;
  heading: string | null;
  items: readonly Place[];
  message: string | null;
}>;

export type PlaceListInput = Readonly<{
  /** Từ khóa đã debounce. */
  query: string;
  /** Tên điểm đến của lịch trình; `null` = không có điểm đến (không gợi ý). */
  destinationName: string | null;
  search: PlaceQuerySlice;
  suggestions: PlaceQuerySlice;
}>;

const NO_ITEMS: readonly Place[] = Object.freeze([]);

/** Lỗi BFF có mã đã biết (vd. `Places.RateLimited`) dùng đúng câu đó; mọi lỗi khác dùng câu chung của tìm địa điểm. */
export function placeErrorMessage(error: unknown): string {
  if (!isApiError(error) || error.code === null) return PLACE_ERROR;
  return ERROR_MESSAGES.get(error.code) ?? PLACE_ERROR;
}

export const isSearchQuery = (query: string): boolean => placeQueryText(query).length >= PLACE_QUERY_MIN_LENGTH;

const emptySearchMessage = (query: string): string =>
  `Không tìm thấy "${placeQueryText(query)}". Thử tên khác hoặc nhập tọa độ thủ công.`;

const message = (status: PlaceListStatus, text: string): PlaceListState => ({
  status,
  heading: null,
  items: NO_ITEMS,
  message: text,
});

// Dữ liệu cũ giữ tạm mà rỗng thì vẫn là đang tải: không hiện "Không tìm thấy" cho từ khóa trước.
const isPending = (slice: PlaceQuerySlice): boolean => {
  if (slice.data === undefined) return true;
  return slice.loading && slice.data.length === 0;
};

function sliceState(slice: PlaceQuerySlice, heading: string, empty: PlaceListState): PlaceListState {
  if (slice.error !== null && slice.error !== undefined) return message("error", placeErrorMessage(slice.error));
  if (isPending(slice)) return message("loading", PLACE_LOADING);
  const items = slice.data ?? NO_ITEMS;
  if (items.length === 0) return empty;
  return { status: "ready", heading, items, message: null };
}

export function placeListState({ query, destinationName, search, suggestions }: PlaceListInput): PlaceListState {
  if (isSearchQuery(query)) return sliceState(search, PLACE_RESULTS_HEADING, message("empty", emptySearchMessage(query)));
  if (destinationName === null) return message("hint", PLACE_HINT);
  // Điểm đến chưa có gợi ý nào: chỉ nhắc gõ để tìm (D-146).
  return sliceState(suggestions, `Gợi ý ở ${destinationName}`, message("hint", PLACE_HINT));
}

/** Câu cho vùng `role="status"` (đọc cho trình đọc màn hình). */
export function placeStatusText(state: PlaceListState): string {
  if (state.status === "ready") return `${state.items.length} kết quả`;
  if (state.status === "empty") return "Không có kết quả";
  if (state.status === "error") return state.message ?? PLACE_ERROR;
  return "";
}
