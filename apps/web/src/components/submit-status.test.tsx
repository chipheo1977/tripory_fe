import { act, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { COLD_START_MESSAGE, SubmitStatus } from "./submit-status";

const region = (container: HTMLElement) => container.querySelector('[aria-live="polite"]') as HTMLElement;

const advance = (ms: number) => act(() => vi.advanceTimersByTime(ms));

describe("SubmitStatus", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("hằng copy đúng chuỗi khóa của D-31", () => {
    expect(COLD_START_MESSAGE).toBe("Máy chủ đang khởi động, có thể mất tới 30 giây…");
  });

  it("luôn có vùng aria-live=polite trong DOM, kể cả khi không pending (nội dung rỗng)", () => {
    const { container } = render(<SubmitStatus pending={false} />);

    expect(region(container)).not.toBeNull();
    expect(region(container).textContent).toBe("");
  });

  it("pending nhưng chưa đủ 5 giây → vẫn rỗng; đủ 5 000 ms → hiện dòng cold start", () => {
    const { container } = render(<SubmitStatus pending />);

    advance(4_999);
    expect(region(container).textContent).toBe("");

    advance(1);
    expect(region(container).textContent).toBe(COLD_START_MESSAGE);
  });

  it("vùng aria-live là cùng một phần tử trước và sau khi hiện chữ (chỉ đổi nội dung)", () => {
    const { container } = render(<SubmitStatus pending />);
    const before = region(container);

    advance(5_000);

    expect(region(container)).toBe(before);
  });

  it("pending về false → xóa dòng ngay", () => {
    const { container, rerender } = render(<SubmitStatus pending />);
    advance(5_000);
    expect(region(container).textContent).toBe(COLD_START_MESSAGE);

    rerender(<SubmitStatus pending={false} />);

    expect(region(container).textContent).toBe("");
  });

  it("pending về false trước 5 giây → timer bị hủy, không hiện muộn", () => {
    const { container, rerender } = render(<SubmitStatus pending />);
    advance(3_000);

    rerender(<SubmitStatus pending={false} />);
    advance(60_000);

    expect(region(container).textContent).toBe("");
    expect(vi.getTimerCount()).toBe(0);
  });

  it("lần gửi sau đếm lại từ đầu, không thừa kế trạng thái chậm của lần trước", () => {
    const { container, rerender } = render(<SubmitStatus pending />);
    advance(5_000);
    rerender(<SubmitStatus pending={false} />);

    rerender(<SubmitStatus pending />);
    expect(region(container).textContent).toBe("");
    advance(4_999);
    expect(region(container).textContent).toBe("");
    advance(1);
    expect(region(container).textContent).toBe(COLD_START_MESSAGE);
  });

  it("delayMs tùy chỉnh được", () => {
    const { container } = render(<SubmitStatus delayMs={1_000} pending />);

    advance(999);
    expect(region(container).textContent).toBe("");
    advance(1);
    expect(region(container).textContent).toBe(COLD_START_MESSAGE);
  });

  it("unmount khi đang chờ thì dọn timer", () => {
    const { unmount } = render(<SubmitStatus pending />);

    unmount();

    expect(vi.getTimerCount()).toBe(0);
  });
});
