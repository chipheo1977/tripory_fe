import { createWgs84Coordinate, parseItineraryId, parseUserId } from '@tripory/shared-kernel';
import { normalizeInterests, parseCalendarDate } from '../domain';
import type { Itinerary, ItineraryAuthor, ItineraryDay, ItinerarySummary, Page, Waypoint } from '../domain';
import type {
  ItineraryAuthorDto,
  ItineraryDetailDto,
  SummaryPageDto,
  ItinerarySummaryDto,
  WaypointDto,
} from './dto';

// ACL: DTO của BE thành type domain. Chỉ chép đúng field domain cần, id hoặc tọa độ hỏng thì ném thay vì trả
// một lịch trình hỏng (D-28, T-04-17). Mọi kết quả đã freeze để cache React Query không bị sửa tại chỗ.

/** `null` cho thiếu, rỗng hoặc toàn khoảng trắng; giá trị khác được cắt khoảng trắng (BE cũng trim). */
const blankToNull = (value: string | null | undefined): string | null => {
  const trimmed = value?.trim() ?? '';

  return trimmed === '' ? null : trimmed;
};

type CoverFields = Pick<ItinerarySummaryDto, 'coverImageUrl' | 'coverImages' | 'selectedCoverIndex'>;

/** Phần tử tại chỉ số; chỉ số thiếu, âm hoặc vượt khoảng cho `null`. */
const coverAt = (list: readonly string[], index: number | null | undefined): string | null => {
  if (index === null || index === undefined) return null;
  return list[index] ?? null;
};

const legacyCovers = (legacy: string | null): string[] => {
  if (legacy === null) return [];
  return [legacy];
};

/** BE cũ chưa có `coverImages` thì suy ra từ `coverImageUrl`. Bỏ chuỗi rỗng và trùng, giữ thứ tự. */
const coverList = (dto: CoverFields): readonly string[] => {
  const source = dto.coverImages ?? legacyCovers(blankToNull(dto.coverImageUrl));
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of source) {
    const url = raw.trim();
    if (url !== '' && !seen.has(url)) {
      seen.add(url);
      result.push(url);
    }
  }
  return Object.freeze(result);
};

/** Ảnh đang hiển thị: `coverImageUrl` của BE, nếu thiếu thì ảnh tại `selectedCoverIndex`. Không lọc scheme (UI chặn khi hiển thị). */
const displayedCover = (dto: CoverFields): string | null =>
  blankToNull(dto.coverImageUrl) ?? coverAt(coverList(dto), dto.selectedCoverIndex);

const byDayThenOrder = (a: WaypointDto, b: WaypointDto): number => a.dayNumber - b.dayNumber || a.orderIndex - b.orderIndex;

export function toWaypoint(dto: WaypointDto): Waypoint {
  const coordinate = createWgs84Coordinate({ latitude: dto.latitude, longitude: dto.longitude });

  if (coordinate === null) throw new Error('Tọa độ điểm đến trong phản hồi của BE không hợp lệ.');

  return Object.freeze({
    id: dto.id,
    dayNumber: dto.dayNumber,
    orderIndex: dto.orderIndex,
    name: dto.name,
    address: blankToNull(dto.address),
    notes: blankToNull(dto.notes),
    coordinate,
  });
}

/** Avatar mặc định chung của BE (`User.cs`): không phải ảnh của người dùng nên coi như không có ảnh (03-04, D-02). Khai báo lại vì context itinerary không import `identity`. */
const DEFAULT_AUTHOR_AVATAR_URL = 'https://api.dicebear.com/7.x/identicon/svg?seed=tripory';

const toAuthorAvatar = (value: string | null | undefined): string | null => {
  const url = blankToNull(value);
  if (url === null || url === DEFAULT_AUTHOR_AVATAR_URL) return null;

  return url;
};

/** `author` hỏng (id sai, tên rỗng) hoặc thiếu thì `undefined`: UI ẩn khối tác giả, không vỡ cả lịch trình. Chỉ chép 3 trường. */
export function toAuthor(dto: ItineraryAuthorDto | null | undefined): ItineraryAuthor | undefined {
  if (dto === null || dto === undefined) return undefined;
  const id = parseUserId(dto.id);
  const displayName = blankToNull(dto.displayName);
  if (id === null || displayName === null) return undefined;

  return Object.freeze({ id, displayName, avatarUrl: toAuthorAvatar(dto.avatarUrl) });
}

/**
 * BE không sắp `days` và `waypoints` (`ToDetailDto` không `OrderBy`), và chỉ trả những ngày có bản ghi, nên mapper
 * sắp lại nhưng không bù ngày thiếu: `buildDayRange` của domain làm việc đó. `sort` làm trên bản sao.
 */
export function toItinerary(dto: ItineraryDetailDto): Itinerary {
  const id = parseItineraryId(dto.id);
  const ownerId = parseUserId(dto.userId);

  if (id === null) throw new Error('Id lịch trình trong phản hồi của BE không hợp lệ.');
  if (ownerId === null) throw new Error('Id chủ lịch trình trong phản hồi của BE không hợp lệ.');

  const days: ItineraryDay[] = [...dto.days]
    .sort((a, b) => a.dayNumber - b.dayNumber)
    .map((day) =>
      Object.freeze({
        dayNumber: day.dayNumber,
        subtitle: blankToNull(day.subtitle),
        distanceKm: day.dayDistanceKm ?? null,
      }),
    );
  const waypoints = [...dto.waypoints].sort(byDayThenOrder).map(toWaypoint);
  const author = toAuthor(dto.author);

  return Object.freeze({
    id,
    ownerId,
    title: dto.title,
    description: blankToNull(dto.description),
    coverImageUrl: displayedCover(dto),
    coverImages: coverList(dto),
    destinationCode: blankToNull(dto.destinationCode),
    interests: Object.freeze(normalizeInterests(dto.interests ?? [])),
    startDate: dto.startDate === null || dto.startDate === undefined ? null : parseCalendarDate(dto.startDate),
    isPublic: dto.isPublic,
    totalDistanceKm: dto.totalDistanceKm,
    days: Object.freeze(days),
    waypoints: Object.freeze(waypoints),
    ...(author === undefined ? {} : { author }),
  });
}

export function toSummary(dto: ItinerarySummaryDto): ItinerarySummary {
  const id = parseItineraryId(dto.id);

  if (id === null) throw new Error('Id lịch trình trong phản hồi của BE không hợp lệ.');

  return Object.freeze({
    id,
    title: dto.title,
    coverImageUrl: displayedCover(dto),
    destinationCode: blankToNull(dto.destinationCode),
    startDate: dto.startDate === null || dto.startDate === undefined ? null : parseCalendarDate(dto.startDate),
    isPublic: dto.isPublic,
    totalDistanceKm: dto.totalDistanceKm,
  });
}

export function toSummaryPage(dto: SummaryPageDto): Page<ItinerarySummary> {
  return Object.freeze({
    items: Object.freeze(dto.items.map(toSummary)),
    pageIndex: dto.pageIndex,
    hasNextPage: dto.hasNextPage,
  });
}
