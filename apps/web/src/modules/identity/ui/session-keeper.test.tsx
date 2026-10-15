import { act, render } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { SessionKeeper } from "./session-keeper";

const h = vi.hoisted(() => ({
  pathname: "/itineraries/mine",
  refreshSession: vi.fn<() => Promise<"refreshed" | "expired">>(),
  emitExpired: vi.fn(),
}));

vi.mock("next/navigation", () => ({ usePathname: () => h.pathname }));
vi.mock("@/composition/http.client", () => ({ refreshSession: h.refreshSession }));
vi.mock("@/composition/session-events.client", () => ({ sessionEvents: { emitExpired: h.emitExpired } }));

const COOKIE = "tripory_at_exp";
const nowSec = () => Math.floor(Date.now() / 1000);
const setExp = (exp: number) => {
  document.cookie = `${COOKIE}=${exp}; path=/`;
};
const clearCookie = () => {
  document.cookie = `${COOKIE}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
};

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
  vi.clearAllMocks();
  h.pathname = "/itineraries/mine";
  h.refreshSession.mockResolvedValue("refreshed");
  clearCookie();
});

afterEach(() => {
  vi.useRealTimers();
  clearCookie();
});

it("schedules a refresh 120 seconds before exp and calls refreshSession once", async () => {
  setExp(nowSec() + 600);
  render(<SessionKeeper />);

  await vi.advanceTimersByTimeAsync(479_000);
  expect(h.refreshSession).not.toHaveBeenCalled();

  await vi.advanceTimersByTimeAsync(1_000);
  expect(h.refreshSession).toHaveBeenCalledTimes(1);
  expect(h.emitExpired).not.toHaveBeenCalled();
});

it("does nothing when there is no at_exp cookie", async () => {
  render(<SessionKeeper />);

  await vi.advanceTimersByTimeAsync(3_600_000);

  expect(h.refreshSession).not.toHaveBeenCalled();
});

it("emits expired when the refresh outcome is expired", async () => {
  h.refreshSession.mockResolvedValue("expired");
  setExp(nowSec() + 600);
  render(<SessionKeeper />);

  await vi.advanceTimersByTimeAsync(480_000);

  expect(h.emitExpired).toHaveBeenCalledTimes(1);
  // Hết phiên thì không hẹn lại.
  await vi.advanceTimersByTimeAsync(600_000);
  expect(h.refreshSession).toHaveBeenCalledTimes(1);
});

it("stays silent on a transient failure and schedules again", async () => {
  h.refreshSession.mockRejectedValueOnce(new Error("network"));
  setExp(nowSec() + 600);
  render(<SessionKeeper />);

  await vi.advanceTimersByTimeAsync(480_000);
  expect(h.refreshSession).toHaveBeenCalledTimes(1);
  expect(h.emitExpired).not.toHaveBeenCalled();

  // Cùng exp: thử lại sau tối thiểu 60 giây.
  await vi.advanceTimersByTimeAsync(60_000);
  expect(h.refreshSession).toHaveBeenCalledTimes(2);
});

it("re-schedules from the new cookie after a successful refresh", async () => {
  h.refreshSession.mockImplementation(async () => {
    setExp(nowSec() + 3_600);
    return "refreshed";
  });
  setExp(nowSec() + 600);
  render(<SessionKeeper />);

  await vi.advanceTimersByTimeAsync(480_000);
  expect(h.refreshSession).toHaveBeenCalledTimes(1);

  await vi.advanceTimersByTimeAsync(3_400_000);
  expect(h.refreshSession).toHaveBeenCalledTimes(1);

  await vi.advanceTimersByTimeAsync(100_000);
  expect(h.refreshSession).toHaveBeenCalledTimes(2);
});

it("does not loop when the cookie keeps the same exp: at least 60 seconds apart", async () => {
  setExp(nowSec() + 600);
  render(<SessionKeeper />);

  await vi.advanceTimersByTimeAsync(480_000);
  expect(h.refreshSession).toHaveBeenCalledTimes(1);

  await vi.advanceTimersByTimeAsync(59_000);
  expect(h.refreshSession).toHaveBeenCalledTimes(1);

  await vi.advanceTimersByTimeAsync(1_000);
  expect(h.refreshSession).toHaveBeenCalledTimes(2);
});

it("rechecks immediately when the tab becomes visible and exp - 120 is already past", async () => {
  setExp(nowSec() + 600);
  render(<SessionKeeper />);

  // Máy ngủ: đồng hồ nhảy tới sát hạn mà timer chưa kịp nổ.
  vi.setSystemTime(Date.now() + 550_000);
  await act(async () => {
    document.dispatchEvent(new Event("visibilitychange"));
    await vi.advanceTimersByTimeAsync(0);
  });

  expect(h.refreshSession).toHaveBeenCalledTimes(1);
});

it("rechecks on the online event", async () => {
  setExp(nowSec() + 600);
  render(<SessionKeeper />);

  vi.setSystemTime(Date.now() + 550_000);
  await act(async () => {
    window.dispatchEvent(new Event("online"));
    await vi.advanceTimersByTimeAsync(0);
  });

  expect(h.refreshSession).toHaveBeenCalledTimes(1);
});

it("picks up a cookie that appears after a route change", async () => {
  const view = render(<SessionKeeper />);
  await vi.advanceTimersByTimeAsync(10_000);
  expect(h.refreshSession).not.toHaveBeenCalled();

  setExp(nowSec() + 300);
  h.pathname = "/itineraries/mine?x";
  view.rerender(<SessionKeeper />);

  await vi.advanceTimersByTimeAsync(180_000);
  expect(h.refreshSession).toHaveBeenCalledTimes(1);
});

it("cancels the timer and listeners on unmount", async () => {
  setExp(nowSec() + 600);
  const view = render(<SessionKeeper />);
  view.unmount();

  vi.setSystemTime(Date.now() + 550_000);
  document.dispatchEvent(new Event("visibilitychange"));
  window.dispatchEvent(new Event("online"));
  await vi.advanceTimersByTimeAsync(600_000);

  expect(h.refreshSession).not.toHaveBeenCalled();
});
