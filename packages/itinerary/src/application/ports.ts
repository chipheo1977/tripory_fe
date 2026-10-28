import type { ItineraryId, Wgs84Coordinate } from '@tripory/shared-kernel';
import type { CalendarDate, Itinerary, ItinerarySummary, Page, StatusFilter, Waypoint } from '../domain';

// Hợp đồng giữa application và adapter. Chỉ có type: cài đặt HTTP nằm ở `infrastructure` (subpath `./http`),
// composition của app lắp vào. Hook React gọi thẳng port; chỉ luật thật (xem `use-cases.ts`) mới có hàm riêng.

export type ListMineQuery = Readonly<{ pageIndex: number; pageSize: number; status: StatusFilter }>;

/** Bốn trường `PUT /itineraries/{id}`; `null` là xóa giá trị. */
export type MetadataInput = Readonly<{
  title: string;
  description: string | null;
  startDate: CalendarDate | null;
  coverImageUrl: string | null;
}>;

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
  create(input: Readonly<{ title: string }>): Promise<Itinerary>;
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
