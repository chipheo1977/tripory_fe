// Ngày lịch thuần `YYYY-MM-DD`, không múi giờ. Giữ là chuỗi vì `<input type="date">` và BE
// (`DateOnly`) đều dùng đúng dạng này, nên form không phải đổi qua lại.
export type CalendarDate = string & { readonly __brand: 'CalendarDate' };

const PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

// Không dựng bằng `new Date(chuỗi)`: chuỗi `YYYY-MM-DD` được hiểu là UTC nhưng hiển thị theo giờ
// địa phương, nên ở múi giờ âm (Mỹ) ngày lùi một. Đi qua `Date.UTC` rồi so lại từng trường UTC:
// vừa bắt ngày không tồn tại (29/02 năm không nhuận, tháng 13) vừa không phụ thuộc múi giờ máy.
export function parseCalendarDate(value: string): CalendarDate | null {
  const match = PATTERN.exec(value);
  if (match === null) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const utc = new Date(Date.UTC(year, month - 1, day));

  const matches = utc.getUTCFullYear() === year && utc.getUTCMonth() === month - 1 && utc.getUTCDate() === day;
  return matches ? (value as CalendarDate) : null;
}

// Tách chuỗi thay vì dùng `Intl`/`toLocaleDateString`: kết quả cố định `DD/MM/YYYY` ở mọi môi trường.
export const formatCalendarDateVi = (date: CalendarDate): string => {
  const [year, month, day] = date.split('-');
  return `${day}/${month}/${year}`;
};
