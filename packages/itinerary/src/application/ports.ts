import type { ItineraryId, Wgs84Coordinate } from '@tripory/shared-kernel';
import type {
  CalendarDate,
  Destination,
  GeoBounds,
  InterestCode,
  Itinerary,
  ItineraryMetadata,
  ItinerarySummary,
  LngLat,
  Page,
  Place,
  StatusFilter,
  SuggestionCategory,
  Waypoint,
} from '../domain';

// Hợp đồng giữa application và adapter. Chỉ có type: cài đặt HTTP nằm ở `infrastructure` (subpath `./http`),
// composition của app lắp vào. Hook React gọi thẳng port; chỉ luật thật (xem `use-cases.ts`) mới có hàm riêng.

export type ListMineQuery = Readonly<{ pageIndex: number; pageSize: number; status: StatusFilter }>;

/** Một request tạo lịch trình (D-96): điểm đến bắt buộc với lịch trình mới (D-102), số ngày 1-30, ngày khởi hành tùy chọn. */
export type CreateItineraryInput = Readonly<{
  title: string;
  destinationCode: string;
  dayCount: number;
  startDate: CalendarDate | null;
  interests: readonly InterestCode[];
}>;

/**
 * Payload `PUT /itineraries/{id}`: bốn trường + danh sách ảnh bìa và chỉ số ảnh hiển thị; `null` là xóa giá trị.
 * Điểm đến và sở thích không nằm ở đây, BE giữ nguyên khi thiếu (D-54, D-77).
 */
export type MetadataInput = ItineraryMetadata;

export type WaypointFields = Readonly<{
  name: string;
  address: string | null;
  notes: string | null;
  coordinate: Wgs84Coordinate;
}>;

export type AddWaypointInput = WaypointFields & Readonly<{ dayNumber: number }>;

export type ReorderInput = Readonly<{ dayNumber: number; orderedIds: readonly string[] }>;

/** Mười một lệnh của BE cho lịch trình và điểm đến. Lỗi của BE lan ra dưới dạng `ApiError`. */
export type ItineraryRepository = Readonly<{
  listMine(query: ListMineQuery, signal?: AbortSignal): Promise<Page<ItinerarySummary>>;
  getById(id: ItineraryId, signal?: AbortSignal): Promise<Itinerary>;
  create(input: CreateItineraryInput): Promise<Itinerary>;
  updateMetadata(id: ItineraryId, input: MetadataInput): Promise<void>;
  publish(id: ItineraryId): Promise<void>;
  remove(id: ItineraryId): Promise<void>;
  addWaypoint(id: ItineraryId, input: AddWaypointInput): Promise<Waypoint>;
  updateWaypoint(id: ItineraryId, waypointId: string, input: WaypointFields): Promise<void>;
  /** `keepalive: true` cho lệnh xóa còn chờ khi trang đang đóng (D-32). */
  deleteWaypoint(id: ItineraryId, waypointId: string, options?: Readonly<{ keepalive?: boolean }>): Promise<void>;
  reorderWaypoints(id: ItineraryId, input: ReorderInput): Promise<void>;
  setDaySubtitle(id: ItineraryId, dayNumber: number, subtitle: string | null): Promise<void>;
}>;

/** Đổi link Google Maps rút gọn thành URL đầy đủ qua route của app (server-side, tránh CORS và SSRF). */
export type ShortLinkResolver = Readonly<{ resolve(url: string, signal?: AbortSignal): Promise<string> }>;

/** Danh mục điểm đến của form tạo. Dữ liệu tĩnh nên đồng bộ; nếu sau này lấy từ BE (D-61) thì đổi sang async. */
export type DestinationCatalog = Readonly<{
  /** Đủ 34 điểm đến theo thứ tự chữ cái đã khai báo (nhóm "Tất cả"). */
  list(): readonly Destination[];
  /** Mã lạ hoặc `null` trả `null`; không ném lỗi (dữ liệu cũ, mã BE thêm trước FE). */
  findBySlug(slug: string | null): Destination | null;
}>;

/** Tìm theo từ khóa trong `bounds`, ưu tiên gần `bias` (tâm điểm đến) khi có. */
export type PlaceSearchQuery = Readonly<{ text: string; bounds: GeoBounds; bias: LngLat | null; limit: number }>;

/** Gợi ý một nhóm danh mục trong khung của điểm đến, không có từ khóa (D-146). */
export type PlaceSuggestionQuery = Readonly<{ bounds: GeoBounds; category: SuggestionCategory; limit: number }>;

/**
 * Nhà cung cấp địa điểm phía server (Photon bây giờ, có thể đổi sang Goong sau, D-142, D-151). Lỗi mạng, timeout
 * hay phản hồi sai dạng đều ném lỗi; lọc chủ quyền là việc của service, không phải của adapter.
 */
export type PlaceSearchProvider = Readonly<{
  search(query: PlaceSearchQuery, signal?: AbortSignal): Promise<readonly Place[]>;
  suggest(query: PlaceSuggestionQuery, signal?: AbortSignal): Promise<readonly Place[]>;
  reverse(coordinate: Wgs84Coordinate, signal?: AbortSignal): Promise<Place | null>;
}>;

/** Chỉ tra ngược tọa độ: Nominatim dự phòng khi Photon không có địa chỉ (D-142). */
export type PlaceReverseProvider = Pick<PlaceSearchProvider, 'reverse'>;

/** Phía client: gọi BFF `/api/places/*`, không bao giờ gọi thẳng nhà cung cấp. Lỗi BFF lan ra dưới dạng `ApiError`. */
export type PlaceLookup = Readonly<{
  search(query: Readonly<{ text: string; destinationCode: string | null }>, signal?: AbortSignal): Promise<readonly Place[]>;
  suggest(destinationCode: string, signal?: AbortSignal): Promise<readonly Place[]>;
  reverse(coordinate: Wgs84Coordinate, signal?: AbortSignal): Promise<Place | null>;
}>;
