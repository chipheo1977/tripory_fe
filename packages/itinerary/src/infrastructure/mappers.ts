import { createWgs84Coordinate, parseItineraryId, parseUserId } from '@tripory/shared-kernel';
import { parseCalendarDate } from '../domain';
import type { Itinerary, ItineraryDay, ItinerarySummary, Page, Waypoint } from '../domain';
import type { ItineraryDetailDto, SummaryPageDto, ItinerarySummaryDto, WaypointDto } from './dto';

// ACL: DTO của BE thành type domain. Chỉ chép đúng field domain cần, id hoặc tọa độ hỏng thì ném thay vì trả
// một lịch trình hỏng (D-28, T-04-17). Mọi kết quả đã freeze để cache React Query không bị sửa tại chỗ.

/** `null` cho thiếu, rỗng hoặc toàn khoảng trắng; giá trị khác được cắt khoảng trắng (BE cũng trim). */
const blankToNull = (value: string | null | undefined): string | null => {
  const trimmed = value?.trim() ?? '';

  return trimmed === '' ? null : trimmed;
};

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

  return Object.freeze({
    id,
    ownerId,
    title: dto.title,
    description: blankToNull(dto.description),
    coverImageUrl: blankToNull(dto.coverImageUrl),
    startDate: dto.startDate === null || dto.startDate === undefined ? null : parseCalendarDate(dto.startDate),
    isPublic: dto.isPublic,
    totalDistanceKm: dto.totalDistanceKm,
    days: Object.freeze(days),
    waypoints: Object.freeze(waypoints),
  });
}

export function toSummary(dto: ItinerarySummaryDto): ItinerarySummary {
  const id = parseItineraryId(dto.id);

  if (id === null) throw new Error('Id lịch trình trong phản hồi của BE không hợp lệ.');

  return Object.freeze({
    id,
    title: dto.title,
    coverImageUrl: blankToNull(dto.coverImageUrl),
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
