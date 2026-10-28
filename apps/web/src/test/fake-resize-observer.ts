// Fake `ResizeObserver`: test báo chiều cao mới của một phần tử bằng `resize(target, height)`.
// Cố ý KHÔNG import `vitest`. jsdom không có ResizeObserver.

export type FakeResizeObserverHandle = Readonly<{
  /** Gọi callback của mọi observer đang theo dõi `target` với chiều cao mới. */
  resize(target: Element, height: number): void;
  /** Trả `globalThis.ResizeObserver` về bản gốc (có thể là undefined). */
  restore(): void;
}>;

export function installFakeResizeObserver(): FakeResizeObserverHandle {
  const original = (globalThis as { ResizeObserver?: unknown }).ResizeObserver;
  const live = new Set<FakeRO>();

  class FakeRO {
    readonly targets = new Set<Element>();

    constructor(readonly callback: ResizeObserverCallback) {
      live.add(this);
    }

    observe(target: Element): void {
      this.targets.add(target);
    }

    unobserve(target: Element): void {
      this.targets.delete(target);
    }

    disconnect(): void {
      this.targets.clear();
      live.delete(this);
    }
  }

  (globalThis as { ResizeObserver?: unknown }).ResizeObserver = FakeRO;

  return {
    resize(target, height) {
      for (const observer of [...live]) {
        if (!observer.targets.has(target)) continue;
        const entry = {
          target,
          contentRect: { height },
          borderBoxSize: [{ blockSize: height }],
        } as unknown as ResizeObserverEntry;
        observer.callback([entry], observer as unknown as ResizeObserver);
      }
    },
    restore() {
      (globalThis as { ResizeObserver?: unknown }).ResizeObserver = original;
    },
  };
}
