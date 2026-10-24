// Fake `navigator.locks` cho test: khóa độc quyền xếp hàng theo tên, hỗ trợ `signal`.
// Một manager dùng chung cho nhiều "tab" (hai client cùng nhận `makeFakeLockManager()`) để mô phỏng
// khóa xuyên tab. Cố ý KHÔNG import `vitest` để dùng được ở mọi môi trường test.

export type LockManagerLike = {
  request<T>(name: string, options: { signal?: AbortSignal }, callback: () => Promise<T>): Promise<T>;
  request<T>(name: string, callback: () => Promise<T>): Promise<T>;
};

export type FakeLockManager = LockManagerLike & {
  /** Tên các khóa đang được giữ (callback đang chạy). */
  held(): string[];
};

type LockOptions = { signal?: AbortSignal };

export function makeFakeLockManager(): FakeLockManager {
  // Đuôi hàng đợi của từng tên; mỗi mục luôn resolve (không bao giờ reject) để hàng đợi không kẹt.
  const tails = new Map<string, Promise<void>>();
  const held: string[] = [];

  function request<T>(name: string, callback: () => Promise<T>): Promise<T>;
  function request<T>(name: string, options: LockOptions, callback: () => Promise<T>): Promise<T>;
  function request<T>(
    name: string,
    optionsOrCallback: LockOptions | (() => Promise<T>),
    maybeCallback?: () => Promise<T>,
  ): Promise<T> {
    const options = typeof optionsOrCallback === "function" ? {} : optionsOrCallback;
    const callback = typeof optionsOrCallback === "function" ? optionsOrCallback : maybeCallback;
    if (callback === undefined) throw new TypeError("request(name, [options], callback) cần callback");

    const signal = options.signal;
    if (signal?.aborted) return Promise.reject(signal.reason);

    return new Promise<T>((resolve, reject) => {
      let abandoned = false;
      const onAbort = () => {
        abandoned = true;
        reject(signal?.reason);
      };
      signal?.addEventListener("abort", onAbort, { once: true });

      const previous = tails.get(name) ?? Promise.resolve();
      const turn = previous.then(async () => {
        signal?.removeEventListener("abort", onAbort);
        if (abandoned) return;

        held.push(name);
        try {
          resolve(await callback());
        } catch (error) {
          reject(error);
        } finally {
          held.splice(held.indexOf(name), 1);
        }
      });
      tails.set(name, turn);
    });
  }

  return { request, held: () => [...held] };
}
