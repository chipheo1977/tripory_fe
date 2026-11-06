// Giới hạn tần suất trong bộ nhớ của một instance server (D-143). Không đọc đồng hồ: caller truyền `nowMs` để test
// điều khiển được và để handler dùng chung một mốc thời gian cho cả request.

export type LimitResult = Readonly<{ ok: true }> | Readonly<{ ok: false; retryAfterSec: number }>;

export type WindowLimiter = Readonly<{ hit(key: string, nowMs: number): LimitResult }>;

const OK: LimitResult = Object.freeze({ ok: true });

/** Số khóa tối đa trước khi dọn khóa đã hết cửa sổ, để bộ nhớ không tăng mãi theo số người dùng. */
const SWEEP_THRESHOLD = 1_000;

/**
 * Cửa sổ trượt: mỗi khóa (id người dùng) được tối đa `limit` lần trong `windowMs` gần nhất. Lần bị từ chối không
 * được tính. `retryAfterSec` làm tròn lên, tối thiểu 1 giây.
 */
export function createWindowLimiter(options: Readonly<{ limit: number; windowMs: number }>): WindowLimiter {
  const hits = new Map<string, number[]>();

  const recentOf = (key: string, nowMs: number): number[] => {
    const since = nowMs - options.windowMs;

    return (hits.get(key) ?? []).filter((at) => at > since);
  };

  const sweep = (nowMs: number) => {
    for (const key of [...hits.keys()]) {
      if (recentOf(key, nowMs).length === 0) hits.delete(key);
    }
  };

  return {
    hit(key, nowMs) {
      if (hits.size > SWEEP_THRESHOLD) sweep(nowMs);

      const recent = recentOf(key, nowMs);
      const oldest = recent[0];

      if (recent.length >= options.limit && oldest !== undefined) {
        hits.set(key, recent);

        return { ok: false, retryAfterSec: Math.max(1, Math.ceil((oldest + options.windowMs - nowMs) / 1000)) };
      }

      recent.push(nowMs);
      hits.set(key, recent);

      return OK;
    },
  };
}

export type MinIntervalGate = Readonly<{ tryPass(nowMs: number): boolean }>;

/**
 * Cổng "tối đa một lần mỗi `minIntervalMs`" cho cả process (Nominatim: tối đa 1 request/giây cho toàn ứng dụng).
 * Cổng đóng thì caller BỎ QUA lần gọi, không xếp hàng.
 */
export function createMinIntervalGate(minIntervalMs: number): MinIntervalGate {
  let lastPassMs: number | null = null;

  return {
    tryPass(nowMs) {
      if (lastPassMs !== null && nowMs - lastPassMs < minIntervalMs) return false;

      lastPassMs = nowMs;

      return true;
    },
  };
}
