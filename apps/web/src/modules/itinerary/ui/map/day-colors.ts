// Đọc màu ngày và độ mờ từ token CSS lúc chạy, vì lớp `line` của MapLibre cần giá trị cụ thể chứ không dùng được
// class Tailwind. Token là nguồn duy nhất (coding-rules): không có hex dự phòng. jsdom trả chuỗi rỗng nên test mock module này.
const DAY_COUNT = 8;
const FALLBACK_DIMMED_OPACITY = 0.35;

export function readDayColors(root: HTMLElement = document.documentElement): readonly string[] {
  const styles = getComputedStyle(root);
  return Array.from({ length: DAY_COUNT }, (_, index) => styles.getPropertyValue(`--map-day-${index + 1}`).trim());
}

/** Độ mờ ngày không chọn, lấy từ `--map-dimmed-opacity`. Số dự phòng chỉ dùng khi token không parse được (đây là số, không phải màu). */
export function readDimmedOpacity(root: HTMLElement = document.documentElement): number {
  const parsed = Number.parseFloat(getComputedStyle(root).getPropertyValue("--map-dimmed-opacity"));
  if (Number.isNaN(parsed)) return FALLBACK_DIMMED_OPACITY;
  return parsed;
}
