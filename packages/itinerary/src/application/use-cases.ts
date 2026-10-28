import { isValidDayOrder } from '../domain';
import type { Itinerary } from '../domain';
import type { ItineraryRepository, ReorderInput } from './ports';

/**
 * Sắp lại điểm đến trong một ngày. BE trả `Itinerary.InvalidReorderList` khi tập id lệch (thiếu, thừa, trùng,
 * rỗng), nên kiểm trước để không tốn một vòng mạng và để cache không bao giờ nhận thứ tự hỏng (T-04-13).
 */
export async function reorderWaypoints(
  repo: Pick<ItineraryRepository, 'reorderWaypoints'>,
  itinerary: Itinerary,
  input: ReorderInput,
): Promise<void> {
  if (!isValidDayOrder(itinerary, input.dayNumber, input.orderedIds)) {
    throw new Error('Thứ tự không khớp danh sách điểm đến của ngày.');
  }

  await repo.reorderWaypoints(itinerary.id, input);
}
