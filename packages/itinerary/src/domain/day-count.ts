export const DAY_COUNT_MIN = 1;
export const DAY_COUNT_MAX = 30;
export const DAY_COUNT_DEFAULT = 3;

export const isValidDayCount = (value: number): boolean =>
  Number.isInteger(value) && value >= DAY_COUNT_MIN && value <= DAY_COUNT_MAX;

/** Kẹp về 1-30; NaN/Infinity về mặc định 3; số thập phân bị cắt bỏ phần lẻ. */
export const clampDayCount = (value: number): number => {
  if (!Number.isFinite(value)) return DAY_COUNT_DEFAULT;
  const whole = Math.trunc(value);
  return Math.min(DAY_COUNT_MAX, Math.max(DAY_COUNT_MIN, whole));
};
