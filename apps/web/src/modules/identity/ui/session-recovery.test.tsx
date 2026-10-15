import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StrictMode } from "react";
import { beforeEach, expect, it, vi } from "vitest";
import { SessionRecovery } from "./session-recovery";

const h = vi.hoisted(() => ({
  refresh: vi.fn(),
  refreshSession: vi.fn<() => Promise<"refreshed" | "expired">>(),
  emitExpired: vi.fn(),
}));

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: h.refresh }) }));
vi.mock("@/composition/http.client", () => ({ refreshSession: h.refreshSession }));
vi.mock("@/composition/session-events.client", () => ({ sessionEvents: { emitExpired: h.emitExpired } }));

const fallback = <p>đang hồi phục</p>;

beforeEach(() => {
  vi.clearAllMocks();
});

it("refreshes once under StrictMode, shows the fallback while waiting, then refreshes the router", async () => {
  let resolve!: (value: "refreshed") => void;
  h.refreshSession.mockReturnValue(new Promise((r) => (resolve = r)));

  render(
    <StrictMode>
      <SessionRecovery fallback={fallback} />
    </StrictMode>,
  );

  expect(screen.getByText("đang hồi phục")).toBeTruthy();
  expect(h.refreshSession).toHaveBeenCalledTimes(1);
  expect(h.refresh).not.toHaveBeenCalled();

  await act(async () => resolve("refreshed"));

  expect(h.refresh).toHaveBeenCalledTimes(1);
  expect(h.emitExpired).not.toHaveBeenCalled();
});

it("emits expired and does not refresh the router when the session is gone", async () => {
  h.refreshSession.mockResolvedValue("expired");

  await act(async () => {
    render(<SessionRecovery fallback={fallback} />);
  });

  expect(h.emitExpired).toHaveBeenCalledTimes(1);
  expect(h.refresh).not.toHaveBeenCalled();
});

it("shows ErrorState on a transient failure without emitting expired, and retries on click", async () => {
  const user = userEvent.setup();
  h.refreshSession.mockRejectedValueOnce(new Error("503"));

  await act(async () => {
    render(<SessionRecovery fallback={fallback} />);
  });

  expect(screen.queryByText("đang hồi phục")).toBeNull();
  expect(screen.getByRole("button", { name: "Thử lại" })).toBeTruthy();
  expect(h.emitExpired).not.toHaveBeenCalled();

  h.refreshSession.mockResolvedValueOnce("refreshed");
  await user.click(screen.getByRole("button", { name: "Thử lại" }));

  expect(h.refreshSession).toHaveBeenCalledTimes(2);
  expect(h.refresh).toHaveBeenCalledTimes(1);
  expect(h.emitExpired).not.toHaveBeenCalled();
});
