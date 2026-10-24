// Ngưỡng tươi của access token, gom một chỗ để proxy, BFF, layout dashboard và SessionKeeper không lệch nhau.
// `nowSec` luôn là tham số: domain bị cấm đọc đồng hồ toàn cục, nơi gọi đưa giờ vào.
// Đơn vị là giây Unix, cùng đơn vị với claim `exp` của JWT.

/**
 * Còn ít hơn hoặc bằng ngần này giây thì coi là stale. Layout `(dashboard)` đưa người dùng vào hồi phục
 * phiên, BFF rút gọn 401 thay vì gửi một token sắp hết hạn lên BE.
 */
export const STALE_AT_SEC = 30;

/**
 * Route refresh chỉ gọi BE khi token còn ít hơn hoặc bằng ngần này giây; còn nhiều hơn thì trả "đã tươi".
 * Nhờ vậy mọi đường gọi refresh (do 401, chủ động, hồi phục) đều idempotent giữa các tab.
 */
export const REFRESH_IF_BELOW_SEC = 150;

/**
 * SessionKeeper hẹn refresh trước hạn ngần này giây. Phải nhỏ hơn `REFRESH_IF_BELOW_SEC`, nếu không đến lúc
 * hẹn token vẫn còn "tươi" theo route và lời gọi thành no-op.
 */
export const PROACTIVE_LEAD_SEC = 120;

/** Số giây còn lại tới `exp`; âm nghĩa là đã hết hạn. */
export const remainingSeconds = (exp: number, nowSec: number): number => exp - nowSec;

/** Còn lại **nhiều hơn** `minSec` giây. Đúng bằng ngưỡng là stale. */
export const isFresh = (exp: number, nowSec: number, minSec: number): boolean =>
  remainingSeconds(exp, nowSec) > minSec;
