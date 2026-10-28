// Định dạng hiển thị của itinerary (UI-SPEC §Định dạng số và ngày).
import { formatCalendarDateVi, type CalendarDate } from "@tripory/itinerary";

// Khởi tạo một lần: `Intl.NumberFormat` đắt hơn việc gọi `format`.
const KM_FORMAT = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 1 });

/** "12,4 km". Ẩn (null) khi 0 hoặc không có số (D-04); luôn là số của BE (D-28), FE không tự cộng. */
export const formatKm = (km: number | null): string | null =>
  km === null || km === 0 ? null : `${KM_FORMAT.format(km)} km`;

/** "Khởi hành 12/10/2026", dựng từ chuỗi `YYYY-MM-DD`, không qua `new Date()` (D-26). */
export const formatStartDate = (date: CalendarDate | null): string | null =>
  date === null ? null : `Khởi hành ${formatCalendarDateVi(date)}`;
