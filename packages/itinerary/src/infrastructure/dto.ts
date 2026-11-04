import { z } from 'zod';

// ACL: hình dạng JSON của BE (tripory_be, 04-RESEARCH.md §Contract BE) sau khi BFF `/api/bff` bóc envelope.
// Mọi thứ vào từ mạng đều qua `.parse` ở đây, nên tên field BE không rò sang domain hay UI.
// Zod mặc định bỏ khóa lạ, nên trường thừa của phản hồi không lọt qua schema (T-04-17).
//
// Thời điểm phải có offset: BE trả `DateTimeOffset` với 7 chữ số lẻ giây (`…08.8812345+00:00`), chuỗi không offset
// là dữ liệu sai chứ không phải "giờ địa phương". Ngày lịch `DateOnly` phải là ngày có thật (không có 29/02 năm thường).

/**
 * `WaypointDto` (`Tripory.Application/UseCases/V1/Itineraries/Responses/WaypointDto.cs`).
 * `longitude` đứng trước `latitude` theo BE; `address` và `notes` là `string?`.
 */
export const waypointDto = z.object({
  id: z.string(),
  dayNumber: z.number().int(),
  orderIndex: z.number().int(),
  name: z.string(),
  address: z.string().nullish(),
  longitude: z.number(),
  latitude: z.number(),
  notes: z.string().nullish(),
});

/** `ItineraryDayDto` (`…/Responses/ItineraryDayDto.cs`). Ngày không có bản ghi thì không xuất hiện trong mảng. */
export const itineraryDayDto = z.object({
  id: z.string(),
  dayNumber: z.number().int(),
  subtitle: z.string().nullish(),
  dayDistanceKm: z.number().nullish(),
});

/** `ItineraryDetailDto` (`…/Responses/ItineraryDetailDto.cs`): `data` của `GET /itineraries/{id}` và `POST /itineraries`. */
export const itineraryDetailDto = z.object({
  id: z.string(),
  userId: z.string(),
  title: z.string(),
  description: z.string().nullish(),
  coverImageUrl: z.string().nullish(),
  // Trường mới (04-BE-CONTRACT.md §8): `.nullish()` để chịu BE chưa deploy; mã là chuỗi tự do (BE có thể thêm mã trước FE).
  coverImages: z.array(z.string()).nullish(),
  selectedCoverIndex: z.number().int().nullish(),
  destinationCode: z.string().nullish(),
  interests: z.array(z.string()).nullish(),
  startDate: z.iso.date().nullish(),
  isPublic: z.boolean(),
  totalDistanceKm: z.number(),
  createdAt: z.iso.datetime({ offset: true }),
  updatedAt: z.iso.datetime({ offset: true }),
  days: z.array(itineraryDayDto),
  waypoints: z.array(waypointDto),
});

/**
 * `ItinerarySummaryDto` (`…/Responses/ItinerarySummaryDto.cs`): một dòng của `GET /itineraries/mine`.
 * Không có `updatedAt`, `days`, `waypoints`; hai bộ đếm kèm theo luôn bằng 0 ở BE nên schema không giữ.
 */
export const itinerarySummaryDto = z.object({
  id: z.string(),
  userId: z.string(),
  title: z.string(),
  description: z.string().nullish(),
  coverImageUrl: z.string().nullish(),
  coverImages: z.array(z.string()).nullish(),
  selectedCoverIndex: z.number().int().nullish(),
  destinationCode: z.string().nullish(),
  startDate: z.iso.date().nullish(),
  isPublic: z.boolean(),
  totalDistanceKm: z.number(),
  createdAt: z.iso.datetime({ offset: true }),
});

/** `PagedResult<T>` (`Tripory.Application/Common/PagedResult.cs`). */
export const pagedDto = <T extends z.ZodType>(item: T) =>
  z.object({
    items: z.array(item),
    pageIndex: z.number().int(),
    pageSize: z.number().int(),
    totalCount: z.number().int(),
    hasNextPage: z.boolean(),
  });

/** `data` của `GET /itineraries/mine`. */
export const summaryPageDto = pagedDto(itinerarySummaryDto);

/** `data` của route FE `POST /api/maps/resolve` (không phải BE): URL đầy đủ sau khi theo link rút gọn. */
export const resolvedLinkDto = z.object({ url: z.string() });

export type WaypointDto = z.infer<typeof waypointDto>;
export type ItineraryDetailDto = z.infer<typeof itineraryDetailDto>;
export type ItinerarySummaryDto = z.infer<typeof itinerarySummaryDto>;
export type SummaryPageDto = z.infer<typeof summaryPageDto>;
