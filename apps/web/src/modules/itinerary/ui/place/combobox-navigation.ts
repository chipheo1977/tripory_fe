// Di chuyển lựa chọn đang active của combobox bằng ↓/↑ (D-150): quay vòng, `-1` = chưa có lựa chọn nào.

export const NO_ACTIVE_INDEX = -1;

const isOutside = (index: number, count: number): boolean => index < 0 || index >= count;

export function nextActiveIndex(key: string, current: number, count: number): number {
  if (count <= 0) return NO_ACTIVE_INDEX;
  if (key === "ArrowDown") {
    if (isOutside(current, count) || current === count - 1) return 0;
    return current + 1;
  }
  if (key === "ArrowUp") {
    if (isOutside(current, count) || current === 0) return count - 1;
    return current - 1;
  }
  return current;
}
