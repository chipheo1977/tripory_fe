import type { DayView, Itinerary, Waypoint } from './itinerary';

// BE chỉ lưu ngày có phụ đề hoặc waypoint nên danh sách có thể thưa (1, 3, 7). UI luôn vẽ liền
// Ngày 1..max để người dùng thấy ngày trống và thêm điểm vào đó (D-28); tối thiểu một ngày.
export function buildDayRange(itinerary: Itinerary): readonly DayView[] {
  const max = Math.max(
    1,
    ...itinerary.days.map((day) => day.dayNumber),
    ...itinerary.waypoints.map((waypoint) => waypoint.dayNumber),
  );

  return Array.from({ length: max }, (_, index) => {
    const dayNumber = index + 1;
    const day = itinerary.days.find((candidate) => candidate.dayNumber === dayNumber);
    return {
      dayNumber,
      subtitle: day?.subtitle ?? null,
      distanceKm: day?.distanceKm ?? null,
      waypoints: waypointsOfDay(itinerary, dayNumber),
    };
  });
}

// Thêm ngày luôn nối vào cuối dải đang hiển thị, không lấp chỗ trống giữa chừng (D-27).
export const nextDayNumber = (itinerary: Itinerary): number => buildDayRange(itinerary).length + 1;

export const waypointsOfDay = (itinerary: Itinerary, dayNumber: number): readonly Waypoint[] =>
  itinerary.waypoints.filter((waypoint) => waypoint.dayNumber === dayNumber);
