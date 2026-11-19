// định dạng số và thời gian của like và bình luận (UI-SPEC §Định dạng số, §Thời gian tương đối).
// `now` truyền vào để test được; component không gọi Date.now() (PITFALLS P11).
const COUNT_FORMAT = new Intl.NumberFormat("vi-VN");

const SECOND_MS = 1000;
const MINUTE_MS = 60 * SECOND_MS;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;
const RELATIVE_LIMIT_DAYS = 7;
export const COMMENT_COUNTER_MAX = 500;

/** số đầy đủ theo vi-VN (1.234.567), không rút gọn; số âm hoặc không hữu hạn hiện 0. */
export function formatCount(value: number): string {
  const safe = Number.isFinite(value) && value > 0 ? value : 0;
  return COUNT_FORMAT.format(safe);
}

export const likeDescription = (count: number): string => `${formatCount(count)} lượt thích`;
export const commentHeading = (count: number): string => `Bình luận (${formatCount(count)})`;
export const commentCountLabel = (count: number): string => `${formatCount(count)} bình luận`;
export const counterText = (length: number): string => `${length}/${COMMENT_COUNTER_MAX}`;

const pad2 = (value: number): string => String(value).padStart(2, "0");

const parseTime = (iso: string): number | null => {
  const time = Date.parse(iso);
  return Number.isNaN(time) ? null : time;
};

/** "dd/MM/yyyy" theo giờ địa phương; chuỗi không hợp lệ trả "". */
export function formatAbsoluteDate(iso: string): string {
  const time = parseTime(iso);
  if (time === null) return "";
  const date = new Date(time);
  return `${pad2(date.getDate())}/${pad2(date.getMonth() + 1)}/${date.getFullYear()}`;
}

/** "HH:mm dd/MM/yyyy" theo giờ địa phương (title của thời gian bình luận); chuỗi không hợp lệ trả "". */
export function formatAbsoluteDateTime(iso: string): string {
  const time = parseTime(iso);
  if (time === null) return "";
  const date = new Date(time);
  return `${pad2(date.getHours())}:${pad2(date.getMinutes())} ${formatAbsoluteDate(iso)}`;
}

/** thời gian tương đối theo bảng ngưỡng; ở tương lai coi là "Vừa xong"; từ 7 ngày hiện ngày tuyệt đối. */
export function formatRelativeTime(isoUtc: string, nowMs: number): string {
  const time = parseTime(isoUtc);
  if (time === null) return "";
  const elapsed = nowMs - time;
  if (elapsed < MINUTE_MS) return "Vừa xong";
  if (elapsed < HOUR_MS) return `${Math.floor(elapsed / MINUTE_MS)} phút trước`;
  if (elapsed < DAY_MS) return `${Math.floor(elapsed / HOUR_MS)} giờ trước`;
  if (elapsed < RELATIVE_LIMIT_DAYS * DAY_MS) return `${Math.floor(elapsed / DAY_MS)} ngày trước`;
  return formatAbsoluteDate(isoUtc);
}

/** chưa biết "bây giờ" (`null`) thì hiện ngày tuyệt đối để HTML server và lần render client đầu trùng nhau. */
export function formatCommentTime(isoUtc: string, nowMs: number | null): string {
  if (nowMs === null) return formatAbsoluteDate(isoUtc);
  return formatRelativeTime(isoUtc, nowMs);
}
