// Cache trong bộ nhớ của một instance server cho `/api/places/*` (D-143): giảm số lần gọi Photon/Nominatim, vì
// chính sách của cả hai yêu cầu không lặp lại cùng một truy vấn. Mỗi instance serverless có cache riêng (chấp nhận).
// LRU dựa vào thứ tự chèn của `Map`: đọc trúng thì chèn lại xuống cuối, đầy thì bỏ mục đầu tiên.

export type TtlCache<T> = Readonly<{
  get(key: string): T | undefined;
  set(key: string, value: T, ttlMs: number): void;
}>;

type Entry<T> = Readonly<{ value: T; expiresAtMs: number }>;

export function createTtlCache<T>(options: Readonly<{ maxEntries: number; nowMs: () => number }>): TtlCache<T> {
  const entries = new Map<string, Entry<T>>();

  return {
    get(key) {
      const entry = entries.get(key);

      if (entry === undefined) return undefined;

      entries.delete(key);

      if (entry.expiresAtMs <= options.nowMs()) return undefined;

      entries.set(key, entry);

      return entry.value;
    },

    set(key, value, ttlMs) {
      entries.delete(key);
      entries.set(key, { value, expiresAtMs: options.nowMs() + ttlMs });

      while (entries.size > options.maxEntries) {
        const oldest = entries.keys().next();

        if (oldest.done === true) break;

        entries.delete(oldest.value);
      }
    },
  };
}
