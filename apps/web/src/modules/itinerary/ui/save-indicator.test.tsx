import { itineraryKeys } from "@tripory/itinerary/react";
import { parseItineraryId } from "@tripory/shared-kernel";
import { QueryClientProvider, useMutation } from "@tanstack/react-query";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import { makeQueryClient } from "@/composition/query-client";
import { SaveIndicator } from "./save-indicator";
import { createSaveStatusStore, SaveStatusProvider } from "./save-status";

const ID = parseItineraryId("3f2a6c1e-8b7d-4e21-9c55-0a1b2c3d4e5f");
if (ID === null) throw new Error("id mẫu phải hợp lệ");

function Writer({ gate }: { gate: Promise<void> }) {
  const mutation = useMutation({ mutationKey: itineraryKeys.write(ID!), mutationFn: () => gate });
  return (
    <button onClick={() => mutation.mutate()} type="button">
      ghi
    </button>
  );
}

function setup(withWriter = false) {
  const store = createSaveStatusStore();
  const queryClient = makeQueryClient();
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const utils = render(
    <QueryClientProvider client={queryClient}>
      <SaveStatusProvider store={store}>
        <SaveIndicator itineraryId={ID!} />
        {withWriter ? <Writer gate={gate} /> : null}
      </SaveStatusProvider>
    </QueryClientProvider>,
  );
  return { store, release, ...utils };
}

const region = () => document.querySelector('[aria-live="polite"]') as HTMLElement;

it("is always in the DOM as a polite live region and empty before any write", () => {
  setup();

  expect(region()).not.toBeNull();
  expect(region().textContent).toBe("");
});

it("shows a spinner and 'Đang lưu…' while a write mutation is pending", async () => {
  const user = userEvent.setup();
  const { release } = setup(true);

  await user.click(screen.getByRole("button", { name: "ghi" }));

  await waitFor(() => expect(region().textContent).toContain("Đang lưu…"));
  expect(region().querySelector('[aria-hidden="true"]')).not.toBeNull();

  await act(async () => {
    release();
  });
  await waitFor(() => expect(region().textContent).not.toContain("Đang lưu…"));
});

it("shows 'Đã lưu' after markSaved", () => {
  const { store } = setup();

  act(() => store.markSaved());

  expect(region().textContent).toContain("Đã lưu");
  expect(screen.queryByRole("button")).toBeNull();
});

it("shows a retry button on failure and calls the exact retry function", async () => {
  const user = userEvent.setup();
  const { store } = setup();
  const retry = vi.fn();

  act(() => store.markFailed(retry));
  await user.click(screen.getByRole("button", { name: "Lỗi – Thử lại" }));

  expect(retry).toHaveBeenCalledTimes(1);
});

it("prefers 'Đang lưu…' over a failure", async () => {
  const user = userEvent.setup();
  const { store, release } = setup(true);
  act(() => store.markFailed(vi.fn()));
  expect(screen.getByRole("button", { name: "Lỗi – Thử lại" })).toBeTruthy();

  await user.click(screen.getByRole("button", { name: "ghi" }));

  await waitFor(() => expect(region().textContent).toContain("Đang lưu…"));
  expect(screen.queryByRole("button", { name: "Lỗi – Thử lại" })).toBeNull();

  await act(async () => {
    release();
  });
});

it("prefers a failure over 'Đã lưu'", () => {
  const { store } = setup();

  act(() => {
    store.markSaved();
    store.markFailed(vi.fn());
  });

  expect(screen.getByRole("button", { name: "Lỗi – Thử lại" })).toBeTruthy();
  expect(region().textContent).not.toContain("Đã lưu");
});
