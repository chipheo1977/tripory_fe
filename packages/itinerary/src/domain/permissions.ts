import type { UserId } from '@tripory/shared-kernel';
import type { Itinerary } from './itinerary';

// Chỉ để ẩn/hiện thao tác trên UI. BE vẫn chặn mọi lệnh ghi của người không phải chủ.
// Hai id cùng đi qua `parseUserId` (chữ thường) nên so sánh `===` không sai vì hoa thường.
export const canEdit = (itinerary: Itinerary, viewerId: UserId | null): boolean =>
  viewerId !== null && itinerary.ownerId === viewerId;

// Waypoint đang chờ xóa (có thể hoàn tác) coi như đã mất: nếu chỉ còn chúng thì không cho xuất bản (D-45).
export const canPublish = (itinerary: Itinerary, pendingDeleteIds: ReadonlySet<string>): boolean =>
  !itinerary.isPublic && itinerary.waypoints.some((waypoint) => !pendingDeleteIds.has(waypoint.id));
