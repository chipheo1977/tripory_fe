// Thông báo kéo thả tiếng Việt cho trình đọc màn hình (ITIN-08, D-34, RESEARCH §Thông báo kéo thả).
// dnd-kit ghi các chuỗi này vào live region bằng text, không phải HTML, nên tên điểm đến do người dùng nhập
// không thể chèn markup (T-04-54).
import type { Announcements, UniqueIdentifier } from "@dnd-kit/core";

export const VI_DRAG_INSTRUCTIONS =
  "Nhấn Space để nhấc điểm đến. Dùng phím mũi tên lên, xuống để di chuyển, nhấn Space để thả hoặc Esc để hủy.";

/**
 * `ids` được gọi lại mỗi lần thông báo (callback chạy ngoài render), nên truyền hàm đọc ref thay vì mảng.
 */
export const viAnnouncements = (ids: () => readonly string[], nameOf: (id: string) => string): Announcements => {
  const position = (id: UniqueIdentifier): string => `${ids().indexOf(String(id)) + 1} trên ${ids().length}`;
  const name = (id: UniqueIdentifier): string => nameOf(String(id));

  return {
    onDragStart: ({ active }) => `Đã nhấc ${name(active.id)}, đang ở vị trí ${position(active.id)}.`,
    onDragOver: ({ active, over }) =>
      over ? `${name(active.id)} đang ở vị trí ${position(over.id)}.` : undefined,
    onDragEnd: ({ active, over }) =>
      over ? `Đã thả ${name(active.id)} ở vị trí ${position(over.id)}.` : undefined,
    onDragCancel: ({ active }) => `Đã hủy. ${name(active.id)} trở lại vị trí ${position(active.id)}.`,
  };
};
