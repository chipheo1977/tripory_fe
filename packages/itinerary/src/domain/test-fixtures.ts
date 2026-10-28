// Dựng dữ liệu mẫu cho test domain. Không export qua barrel: chỉ test trong package này dùng.
import { createWgs84Coordinate, parseItineraryId, parseUserId } from '@tripory/shared-kernel';
import type { Itinerary, ItineraryDay, Waypoint } from './itinerary';

const OWNER_ID = '3f2504e0-4f89-11d3-9a0c-0305e82c3301';
const OTHER_ID = '7c9e6679-7425-40de-944b-e07fc1f90ae7';
const ITINERARY_ID = 'a1b2c3d4-0000-4000-8000-000000000001';

export const ownerIdFixture = (() => {
  const id = parseUserId(OWNER_ID);
  if (id === null) throw new Error('id mẫu phải hợp lệ');
  return id;
})();

export const otherUserIdFixture = (() => {
  const id = parseUserId(OTHER_ID);
  if (id === null) throw new Error('id mẫu phải hợp lệ');
  return id;
})();

const itineraryIdFixture = (() => {
  const id = parseItineraryId(ITINERARY_ID);
  if (id === null) throw new Error('id mẫu phải hợp lệ');
  return id;
})();

const coordinate = (() => {
  const value = createWgs84Coordinate({ latitude: 16.0471, longitude: 108.2068 });
  if (value === null) throw new Error('tọa độ mẫu phải hợp lệ');
  return value;
})();

export const makeWaypoint = (id: string, dayNumber: number, orderIndex: number, overrides: Partial<Waypoint> = {}): Waypoint =>
  Object.freeze({
    id,
    dayNumber,
    orderIndex,
    name: `Điểm ${id}`,
    address: null,
    notes: null,
    coordinate,
    ...overrides,
  });

export const makeDay = (dayNumber: number, subtitle: string | null = null, distanceKm: number | null = null): ItineraryDay =>
  Object.freeze({ dayNumber, subtitle, distanceKm });

export const makeItinerary = (overrides: Partial<Itinerary> = {}): Itinerary =>
  Object.freeze({
    id: itineraryIdFixture,
    ownerId: ownerIdFixture,
    title: 'Đà Nẵng 3 ngày',
    description: null,
    coverImageUrl: null,
    startDate: null,
    isPublic: false,
    totalDistanceKm: 0,
    days: Object.freeze([]),
    waypoints: Object.freeze([]),
    ...overrides,
  });
