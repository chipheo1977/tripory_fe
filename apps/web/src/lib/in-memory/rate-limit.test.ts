// @vitest-environment node
import { describe, expect, it } from "vitest";
import { createMinIntervalGate, createWindowLimiter } from "./rate-limit";

describe("createWindowLimiter", () => {
  it("cho tối đa limit lần trong cửa sổ, lần sau bị từ chối kèm retryAfterSec", () => {
    const limiter = createWindowLimiter({ limit: 3, windowMs: 60_000 });

    expect(limiter.hit("u1", 0)).toEqual({ ok: true });
    expect(limiter.hit("u1", 1_000)).toEqual({ ok: true });
    expect(limiter.hit("u1", 2_000)).toEqual({ ok: true });
    expect(limiter.hit("u1", 10_000)).toEqual({ ok: false, retryAfterSec: 50 });
  });

  it("cửa sổ trượt: lần cũ nhất ra khỏi cửa sổ thì được lại", () => {
    const limiter = createWindowLimiter({ limit: 2, windowMs: 60_000 });

    limiter.hit("u1", 0);
    limiter.hit("u1", 30_000);
    expect(limiter.hit("u1", 59_999).ok).toBe(false);
    expect(limiter.hit("u1", 60_000).ok).toBe(true);
    expect(limiter.hit("u1", 60_001).ok).toBe(false);
  });

  it("lần bị từ chối không được tính", () => {
    const limiter = createWindowLimiter({ limit: 1, windowMs: 1_000 });

    limiter.hit("u1", 0);
    limiter.hit("u1", 500);
    limiter.hit("u1", 900);

    expect(limiter.hit("u1", 1_000).ok).toBe(true);
  });

  it("retryAfterSec làm tròn lên, tối thiểu 1", () => {
    const limiter = createWindowLimiter({ limit: 1, windowMs: 60_000 });

    limiter.hit("u1", 0);

    expect(limiter.hit("u1", 58_500)).toEqual({ ok: false, retryAfterSec: 2 });
    expect(limiter.hit("u1", 59_999)).toEqual({ ok: false, retryAfterSec: 1 });
  });

  it("mỗi khóa độc lập", () => {
    const limiter = createWindowLimiter({ limit: 1, windowMs: 60_000 });

    limiter.hit("u1", 0);

    expect(limiter.hit("u1", 1).ok).toBe(false);
    expect(limiter.hit("u2", 1).ok).toBe(true);
  });

  it("vẫn đúng sau khi dọn nhiều khóa đã hết cửa sổ", () => {
    const limiter = createWindowLimiter({ limit: 1, windowMs: 1_000 });

    for (let index = 0; index < 1_100; index += 1) limiter.hit(`old-${index}`, 0);

    limiter.hit("u1", 5_000);

    expect(limiter.hit("u1", 5_001).ok).toBe(false);
    expect(limiter.hit("old-1", 5_001).ok).toBe(true);
  });
});

describe("createMinIntervalGate", () => {
  it("lần đầu qua; trong khoảng tối thiểu thì đóng; đủ khoảng thì mở lại", () => {
    const gate = createMinIntervalGate(1_100);

    expect(gate.tryPass(10_000)).toBe(true);
    expect(gate.tryPass(11_099)).toBe(false);
    expect(gate.tryPass(11_100)).toBe(true);
  });

  it("lần bị chặn không dời mốc", () => {
    const gate = createMinIntervalGate(1_100);

    gate.tryPass(0);
    gate.tryPass(1_000);

    expect(gate.tryPass(1_100)).toBe(true);
  });
});
