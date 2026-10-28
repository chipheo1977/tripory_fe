// Biến đổi thuần cho optimistic update của cache React Query. Mọi hàm trả bản mới đã freeze,
// không sửa đầu vào (cache cũ còn dùng để hoàn tác khi lệnh ghi lỗi). Không import dnd-kit:
// hook kéo thả chỉ báo (from, to), còn việc đổi chỗ nằm ở `moveItem` để test không cần DOM.
import type { Itinerary, ItineraryDay, Waypoint } from './itinerary';

const frozenList = <T>(items: readonly T[]): readonly T[] => Object.freeze([...items]);

const withWaypoints = (itinerary: Itinerary, waypoints: readonly Waypoint[]): Itinerary =>
  Object.freeze({ ...itinerary, waypoints: frozenList(waypoints) });

const withDays = (itinerary: Itinerary, days: readonly ItineraryDay[]): Itinerary =>
  Object.freeze({ ...itinerary, days: frozenList(days) });

// Cùng thứ tự với mapper: theo ngày rồi theo orderIndex. `sort` ổn định nên điểm cùng khóa giữ chỗ.
const sortWaypoints = (waypoints: readonly Waypoint[]): Waypoint[] =>
  [...waypoints].sort((a, b) => a.dayNumber - b.dayNumber || a.orderIndex - b.orderIndex);

// Đánh lại orderIndex 0..n-1 theo thứ tự mảng, trả waypoint mới đã freeze.
const renumber = (waypoints: readonly Waypoint[]): Waypoint[] =>
  waypoints.map((waypoint, index) => Object.freeze({ ...waypoint, orderIndex: index }));

const idsOf = (waypoints: readonly Waypoint[]): string[] => waypoints.map((waypoint) => waypoint.id);

const ofDay = (itinerary: Itinerary, dayNumber: number): readonly Waypoint[] =>
  itinerary.waypoints.filter((waypoint) => waypoint.dayNumber === dayNumber);

export function moveItem<T>(items: readonly T[], from: number, to: number): readonly T[] {
  const copy = [...items];
  const inRange = (index: number): boolean => Number.isInteger(index) && index >= 0 && index < copy.length;
  if (!inRange(from) || !inRange(to)) return Object.freeze(copy);

  const [moved] = copy.splice(from, 1);
  copy.splice(to, 0, moved as T);
  return Object.freeze(copy);
}

export const isSameOrder = (a: readonly string[], b: readonly string[]): boolean =>
  a.length === b.length && a.every((value, index) => value === b[index]);

// BE trả `InvalidReorderList` nếu danh sách không đúng là hoán vị của tập waypoint trong ngày
// (T-04-13), nên kiểm trước khi gửi: không trùng, không thiếu, không thừa, không rỗng.
export function isValidDayOrder(itinerary: Itinerary, dayNumber: number, orderedIds: readonly string[]): boolean {
  const current = idsOf(ofDay(itinerary, dayNumber));
  if (orderedIds.length === 0 || orderedIds.length !== current.length) return false;

  const wanted = new Set(orderedIds);
  return wanted.size === orderedIds.length && current.every((id) => wanted.has(id));
}

// Thứ tự không hợp lệ thì trả nguyên lịch trình: cache không bao giờ bị ghi dữ liệu hỏng.
export function applyDayOrder(itinerary: Itinerary, dayNumber: number, orderedIds: readonly string[]): Itinerary {
  if (!isValidDayOrder(itinerary, dayNumber, orderedIds)) return itinerary;

  const byId = new Map(ofDay(itinerary, dayNumber).map((waypoint) => [waypoint.id, waypoint] as const));
  const reordered = renumber(orderedIds.map((id) => byId.get(id) as Waypoint));
  const others = itinerary.waypoints.filter((waypoint) => waypoint.dayNumber !== dayNumber);
  return withWaypoints(itinerary, sortWaypoints([...others, ...reordered]));
}

export function withoutWaypoint(itinerary: Itinerary, waypointId: string): Itinerary {
  const target = itinerary.waypoints.find((waypoint) => waypoint.id === waypointId);
  if (target === undefined) return itinerary;

  const others = itinerary.waypoints.filter((waypoint) => waypoint.dayNumber !== target.dayNumber);
  const sameDay = ofDay(itinerary, target.dayNumber).filter((waypoint) => waypoint.id !== waypointId);
  return withWaypoints(itinerary, sortWaypoints([...others, ...renumber(sameDay)]));
}

// Điểm mới luôn nằm cuối ngày: orderIndex của đầu vào bị bỏ, lấy theo số điểm đang có.
export function appendWaypoint(itinerary: Itinerary, waypoint: Waypoint): Itinerary {
  const added = Object.freeze({ ...waypoint, orderIndex: ofDay(itinerary, waypoint.dayNumber).length });
  return withWaypoints(itinerary, sortWaypoints([...itinerary.waypoints, added]));
}

const sortDays = (days: readonly ItineraryDay[]): ItineraryDay[] => [...days].sort((a, b) => a.dayNumber - b.dayNumber);

// Phụ đề rỗng thành null và cắt khoảng trắng như `SetSubtitle` của BE; BE không tính lại km
// khi đổi phụ đề nên giữ nguyên `distanceKm`.
export function withDaySubtitle(itinerary: Itinerary, dayNumber: number, subtitle: string): Itinerary {
  const trimmed = subtitle.trim();
  const next = trimmed === '' ? null : trimmed;
  const existing = itinerary.days.find((day) => day.dayNumber === dayNumber);

  const updated: ItineraryDay = Object.freeze({
    dayNumber,
    subtitle: next,
    distanceKm: existing?.distanceKm ?? null,
  });
  const others = itinerary.days.filter((day) => day.dayNumber !== dayNumber);
  return withDays(itinerary, sortDays([...others, updated]));
}

export function withDay(itinerary: Itinerary, dayNumber: number): Itinerary {
  if (itinerary.days.some((day) => day.dayNumber === dayNumber)) return itinerary;

  const added: ItineraryDay = Object.freeze({ dayNumber, subtitle: null, distanceKm: null });
  return withDays(itinerary, sortDays([...itinerary.days, added]));
}
