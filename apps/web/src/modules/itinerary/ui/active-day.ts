// Ngày đang đọc của chế độ Bài viết (D-06). Hàm thuần: chạm đáy trang thì là ngày cuối; có mục giao vùng quan sát thì lấy
// số nhỏ nhất; không mục nào giao thì giữ ngày trước (giữa hai mục ngày vẫn còn một chip được tô).
export type ActiveDayInput = Readonly<{
  previous: number;
  intersecting: ReadonlySet<number>;
  atBottom: boolean;
  lastDay: number;
}>;

export function nextActiveDay({ previous, intersecting, atBottom, lastDay }: ActiveDayInput): number {
  if (atBottom) return lastDay;
  if (intersecting.size === 0) return previous;
  return Math.min(...intersecting);
}
