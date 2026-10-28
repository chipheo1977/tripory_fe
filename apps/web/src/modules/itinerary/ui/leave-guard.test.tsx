import { itineraryKeys } from "@tripory/itinerary/react";
import { parseItineraryId } from "@tripory/shared-kernel";
import { QueryClientProvider, useMutation } from "@tanstack/react-query";
import { act, render, renderHook, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { makeQueryClient } from "@/composition/query-client";
import { useBeforeUnloadWarning, useEditorLeaveGuard } from "./leave-guard";

const h = vi.hoisted(() => ({ push: vi.fn() }));

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: h.push, replace: vi.fn(), back: vi.fn() }) }));

const ID = parseItineraryId("3f2a6c1e-8b7d-4e21-9c55-0a1b2c3d4e5f");
if (ID === null) throw new Error("id mẫu phải hợp lệ");

const TITLE = "Thay đổi đang được lưu. Rời trang?";
const HREF = "/itineraries/mine";

beforeEach(() => {
  h.push.mockReset();
});
afterEach(() => {
  vi.restoreAllMocks();
});

const beforeUnloadCalls = (spy: { mock: { calls: unknown[][] } }) =>
  spy.mock.calls.filter((call) => call[0] === "beforeunload");

it("attaches beforeunload only while dirty and detaches on clean or unmount", () => {
  const add = vi.spyOn(window, "addEventListener");
  const remove = vi.spyOn(window, "removeEventListener");
  const { rerender, unmount } = renderHook(({ dirty }) => useBeforeUnloadWarning(dirty), {
    initialProps: { dirty: false },
  });
  expect(beforeUnloadCalls(add)).toHaveLength(0);

  rerender({ dirty: true });
  expect(beforeUnloadCalls(add)).toHaveLength(1);

  rerender({ dirty: false });
  expect(beforeUnloadCalls(remove)).toHaveLength(1);

  rerender({ dirty: true });
  expect(beforeUnloadCalls(add)).toHaveLength(2);
  unmount();
  expect(beforeUnloadCalls(remove)).toHaveLength(2);
});

it("cancels the unload with an empty returnValue while dirty", () => {
  renderHook(() => useBeforeUnloadWarning(true));
  const event = new Event("beforeunload", { cancelable: true }) as BeforeUnloadEvent;
  // jsdom có `Event.returnValue` kiểu boolean; BeforeUnloadEvent thật là chuỗi. Ghi đè để kiểm đúng giá trị.
  Object.defineProperty(event, "returnValue", { value: undefined, writable: true });

  window.dispatchEvent(event);

  expect(event.defaultPrevented).toBe(true);
  expect(event.returnValue).toBe("");
});

it("does not cancel the unload when clean", () => {
  renderHook(() => useBeforeUnloadWarning(false));
  const event = new Event("beforeunload", { cancelable: true });

  window.dispatchEvent(event);

  expect(event.defaultPrevented).toBe(false);
});

function Writer({ gate }: { gate: Promise<void> }) {
  const mutation = useMutation({ mutationKey: itineraryKeys.write(ID!), mutationFn: () => gate });
  return (
    <button onClick={() => mutation.mutate()} type="button">
      ghi
    </button>
  );
}

function Harness({
  formDirty,
  action,
  onEvent,
}: {
  formDirty: boolean;
  action: () => void;
  onEvent: (event: { preventDefault: () => void }) => void;
}) {
  const { guard, requestLeave, dialog } = useEditorLeaveGuard({ itineraryId: ID!, formDirty });
  return (
    <>
      <button
        onClick={() => {
          const event = { preventDefault: vi.fn() };
          guard.onNavigate(event, HREF);
          onEvent(event);
        }}
        type="button"
      >
        nav
      </button>
      <button onClick={() => requestLeave(action)} type="button">
        back
      </button>
      {dialog}
    </>
  );
}

function setup(formDirty = false) {
  const user = userEvent.setup();
  const action = vi.fn();
  const onEvent = vi.fn();
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  render(
    <QueryClientProvider client={makeQueryClient()}>
      <Writer gate={gate} />
      <Harness action={action} formDirty={formDirty} onEvent={onEvent} />
    </QueryClientProvider>,
  );
  const startWrite = () => user.click(screen.getByRole("button", { name: "ghi" }));
  return { user, action, onEvent, release: () => act(async () => release()), startWrite };
}

const prevented = (onEvent: ReturnType<typeof vi.fn>) => onEvent.mock.calls[0]?.[0].preventDefault as ReturnType<typeof vi.fn>;

it("lets navigation and requestLeave through when nothing is being saved", async () => {
  const { user, action, onEvent } = setup();

  await user.click(screen.getByRole("button", { name: "nav" }));
  expect(prevented(onEvent)).not.toHaveBeenCalled();

  await user.click(screen.getByRole("button", { name: "back" }));
  expect(action).toHaveBeenCalledTimes(1);
  expect(screen.queryByRole("dialog")).toBeNull();
});

it("blocks an in-app link while a write is pending and asks first, focusing 'Ở lại'", async () => {
  const { user, onEvent, startWrite, release } = setup();
  await startWrite();

  await user.click(screen.getByRole("button", { name: "nav" }));

  expect(prevented(onEvent)).toHaveBeenCalledTimes(1);
  const dialog = await screen.findByRole("dialog", { name: TITLE });
  expect(dialog.textContent).toContain("Nếu rời ngay, thay đổi đang gửi có thể không được lưu.");
  await waitFor(() => expect(document.activeElement).toBe(screen.getByRole("button", { name: "Ở lại" })));
  expect(h.push).not.toHaveBeenCalled();
  await release();
});

it("'Ở lại' closes the dialog without navigating", async () => {
  const { user, startWrite, release } = setup();
  await startWrite();
  await user.click(screen.getByRole("button", { name: "nav" }));
  await screen.findByRole("dialog", { name: TITLE });

  await user.click(screen.getByRole("button", { name: "Ở lại" }));

  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  expect(h.push).not.toHaveBeenCalled();
  await release();
  expect(h.push).not.toHaveBeenCalled();
});

it("'Rời trang' navigates to the blocked link right away", async () => {
  const { user, startWrite, release } = setup();
  await startWrite();
  await user.click(screen.getByRole("button", { name: "nav" }));
  await screen.findByRole("dialog", { name: TITLE });

  await user.click(screen.getByRole("button", { name: "Rời trang" }));

  expect(h.push).toHaveBeenCalledTimes(1);
  expect(h.push).toHaveBeenCalledWith(HREF);
  await release();
});

it("requestLeave asks first while a write is pending and runs the action on 'Rời trang'", async () => {
  const { user, action, startWrite, release } = setup();
  await startWrite();

  await user.click(screen.getByRole("button", { name: "back" }));
  await screen.findByRole("dialog", { name: TITLE });
  expect(action).not.toHaveBeenCalled();

  await user.click(screen.getByRole("button", { name: "Rời trang" }));
  expect(action).toHaveBeenCalledTimes(1);
  await release();
});

it("closes by itself and continues to the blocked link once every write is done", async () => {
  const { user, startWrite, release } = setup();
  await startWrite();
  await user.click(screen.getByRole("button", { name: "nav" }));
  await screen.findByRole("dialog", { name: TITLE });

  await release();

  await waitFor(() => expect(h.push).toHaveBeenCalledWith(HREF));
  expect(h.push).toHaveBeenCalledTimes(1);
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
});

it("warns on unload while a write is pending and stops once it is done", async () => {
  const { startWrite, release } = setup();
  await startWrite();
  const during = new Event("beforeunload", { cancelable: true });
  window.dispatchEvent(during);
  expect(during.defaultPrevented).toBe(true);

  await release();

  await waitFor(() => {
    const after = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(after);
    expect(after.defaultPrevented).toBe(false);
  });
});

it("a dirty form warns on unload but does not block in-app navigation", async () => {
  const { user, onEvent } = setup(true);
  const unload = new Event("beforeunload", { cancelable: true });
  window.dispatchEvent(unload);
  expect(unload.defaultPrevented).toBe(true);

  await user.click(screen.getByRole("button", { name: "nav" }));

  expect(prevented(onEvent)).not.toHaveBeenCalled();
  expect(screen.queryByRole("dialog")).toBeNull();
});
