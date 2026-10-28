// Fake `IntersectionObserver` cho test cuộn vô hạn: giữ callback để test chủ động báo "đã cắt nhau".
// Cố ý KHÔNG import `vitest` để dùng được ở mọi môi trường. jsdom không có IntersectionObserver.

export type FakeIntersectionObserverInstance = {
  readonly callback: IntersectionObserverCallback;
  readonly options?: IntersectionObserverInit | undefined;
  readonly targets: Set<Element>;
  disconnected: boolean;
  observe(target: Element): void;
  unobserve(target: Element): void;
  disconnect(): void;
  takeRecords(): IntersectionObserverEntry[];
};

export type FakeIntersectionObserverHandle = Readonly<{
  /** Mọi observer đã được tạo kể từ lúc cài (kể cả đã disconnect). */
  instances: FakeIntersectionObserverInstance[];
  /** Gọi callback của mọi observer chưa disconnect, mỗi target một entry. */
  trigger(isIntersecting: boolean): void;
  /** Trả `globalThis.IntersectionObserver` về bản gốc (có thể là undefined). */
  restore(): void;
}>;

export function installFakeIntersectionObserver(): FakeIntersectionObserverHandle {
  const original = (globalThis as { IntersectionObserver?: unknown }).IntersectionObserver;
  const instances: FakeIntersectionObserverInstance[] = [];

  class FakeIO implements FakeIntersectionObserverInstance {
    readonly targets = new Set<Element>();
    disconnected = false;

    constructor(
      readonly callback: IntersectionObserverCallback,
      readonly options?: IntersectionObserverInit,
    ) {
      instances.push(this);
    }

    observe(target: Element): void {
      this.targets.add(target);
    }

    unobserve(target: Element): void {
      this.targets.delete(target);
    }

    disconnect(): void {
      this.disconnected = true;
      this.targets.clear();
    }

    takeRecords(): IntersectionObserverEntry[] {
      return [];
    }
  }

  (globalThis as { IntersectionObserver?: unknown }).IntersectionObserver = FakeIO;

  return {
    instances,
    trigger(isIntersecting) {
      for (const instance of instances) {
        if (instance.disconnected) continue;
        const entries = [...instance.targets].map(
          (target) => ({ isIntersecting, target }) as unknown as IntersectionObserverEntry,
        );
        instance.callback(entries, instance as unknown as IntersectionObserver);
      }
    },
    restore() {
      (globalThis as { IntersectionObserver?: unknown }).IntersectionObserver = original;
    },
  };
}
