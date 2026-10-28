import { makeApiError } from "@tripory/api-client";
import { parseItineraryId } from "@tripory/shared-kernel";
import { notify } from "@tripory/ui-web";
import { QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { makeQueryClient } from "@/composition/query-client";
import { DeleteItineraryDialog, type DeleteTarget } from "./delete-itinerary-dialog";

const h = vi.hoisted(() => ({ remove: vi.fn() }));

vi.mock("@/composition/itinerary.client", async () => {
  const { createItineraryHooks } = await import("@tripory/itinerary/react");
  const unused = vi.fn();
  return {
    itinerary: createItineraryHooks({
      repository: {
        listMine: unused,
        getById: unused,
        create: unused,
        updateMetadata: unused,
        publish: unused,
        remove: (id: string) => h.remove(id),
        addWaypoint: unused,
        updateWaypoint: unused,
        deleteWaypoint: unused,
        reorderWaypoints: unused,
        setDaySubtitle: unused,
      },
      shortLinks: { resolve: unused },
    }),
  };
});

const ID = parseItineraryId("3f2a6c1e-8b7d-4e21-9c55-0a1b2c3d4e5f");
if (ID === null) throw new Error("id mẫu phải hợp lệ");

const draft: DeleteTarget = { id: ID, title: "Sài Gòn 3 ngày", isPublic: false };
const published: DeleteTarget = { ...draft, isPublic: true };

const http = (status: number, code: string | null, message: string | null) =>
  makeApiError({ kind: "http", status, code, message });

const confirmButton = () => screen.getByRole("button", { name: /^Xóa$|Đang xóa/ });

function setup(target: DeleteTarget | null = draft) {
  const user = userEvent.setup();
  const onOpenChange = vi.fn();
  const onDeleted = vi.fn();
  render(
    <QueryClientProvider client={makeQueryClient()}>
      <DeleteItineraryDialog onDeleted={onDeleted} onOpenChange={onOpenChange} target={target} />
    </QueryClientProvider>,
  );
  return { user, onOpenChange, onDeleted };
}

beforeEach(() => {
  vi.clearAllMocks();
  h.remove.mockResolvedValue(undefined);
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

it("renders nothing without a target", () => {
  setup(null);
  expect(screen.queryByRole("dialog")).toBeNull();
});

it("asks for a draft with the irreversible sentence only", async () => {
  setup(draft);
  const dialog = await screen.findByRole("dialog", { name: 'Xóa lịch trình "Sài Gòn 3 ngày"?' });
  expect(dialog.textContent).toContain("Thao tác này không hoàn tác được.");
  expect(dialog.textContent).not.toContain("Link chia sẻ sẽ không còn mở được.");
});

it("adds the share-link sentence in the same paragraph for a published itinerary", async () => {
  setup(published);
  const description = await screen.findByText(/Thao tác này không hoàn tác được\./);
  expect(description.textContent).toBe("Thao tác này không hoàn tác được. Link chia sẻ sẽ không còn mở được.");
});

it("puts the initial focus on Hủy, not on the destructive button", async () => {
  setup();
  const cancel = await screen.findByRole("button", { name: "Hủy" });
  await waitFor(() => expect(document.activeElement).toBe(cancel));
  expect(confirmButton().className).toContain("bg-danger");
});

it("deletes, reports the id, toasts success once and closes", async () => {
  const success = vi.spyOn(notify, "success");
  const { user, onDeleted, onOpenChange } = setup();
  await user.click(await screen.findByRole("button", { name: "Xóa" }));
  await waitFor(() => expect(onDeleted).toHaveBeenCalledTimes(1));
  expect(h.remove).toHaveBeenCalledWith(ID);
  expect(onDeleted).toHaveBeenCalledWith(ID);
  expect(onOpenChange).toHaveBeenCalledWith(false);
  expect(success).toHaveBeenCalledTimes(1);
  expect(success).toHaveBeenCalledWith("Đã xóa lịch trình");
});

it("cancels without calling the server", async () => {
  const { user, onOpenChange, onDeleted } = setup();
  await user.click(await screen.findByRole("button", { name: "Hủy" }));
  expect(onOpenChange).toHaveBeenCalledWith(false);
  expect(h.remove).not.toHaveBeenCalled();
  expect(onDeleted).not.toHaveBeenCalled();
});

it("locks while pending: busy label, no second call, Hủy and Esc do not close", async () => {
  let resolve: () => void = () => undefined;
  h.remove.mockReturnValue(new Promise<void>((r) => (resolve = r)));
  const { onOpenChange, onDeleted } = setup();
  await screen.findByRole("dialog");
  vi.useFakeTimers();
  fireEvent.click(confirmButton());
  await act(() => vi.advanceTimersByTimeAsync(0));

  const busy = screen.getByRole("button", { name: /Đang xóa/ });
  expect(busy.getAttribute("aria-busy")).toBe("true");
  expect(busy.textContent).toBe("Đang xóa…");
  fireEvent.click(busy);
  const cancel = screen.getByRole("button", { name: "Hủy" }) as HTMLButtonElement;
  expect(cancel.hasAttribute("disabled") || cancel.getAttribute("aria-disabled") === "true").toBe(true);
  fireEvent.click(cancel);
  fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
  await act(() => vi.advanceTimersByTimeAsync(0));
  expect(h.remove).toHaveBeenCalledTimes(1);
  expect(onOpenChange).not.toHaveBeenCalled();

  await act(() => vi.advanceTimersByTimeAsync(5_000));
  expect(screen.getByText("Máy chủ đang khởi động, có thể mất tới 30 giây…")).toBeTruthy();

  await act(async () => resolve());
  expect(onDeleted).toHaveBeenCalledTimes(1);
});

it("shows the failure in an InlineAlert inside the dialog, without an error toast, and allows a retry", async () => {
  const errorToast = vi.spyOn(notify, "error");
  h.remove.mockRejectedValueOnce(http(500, null, null));
  const { user, onDeleted, onOpenChange } = setup();
  await user.click(await screen.findByRole("button", { name: "Xóa" }));
  const alert = await screen.findByRole("alert");
  expect(screen.getByRole("dialog").contains(alert)).toBe(true);
  expect(onDeleted).not.toHaveBeenCalled();
  expect(onOpenChange).not.toHaveBeenCalled();
  expect(errorToast).not.toHaveBeenCalled();

  await user.click(screen.getByRole("button", { name: "Xóa" }));
  await waitFor(() => expect(onDeleted).toHaveBeenCalledTimes(1));
  expect(screen.queryByRole("alert")).toBeNull();
});

it("maps Itinerary.NotFound to its curated sentence", async () => {
  h.remove.mockRejectedValue(http(404, "Itinerary.NotFound", "x"));
  const { user } = setup();
  await user.click(await screen.findByRole("button", { name: "Xóa" }));
  expect((await screen.findByRole("alert")).textContent).toBe("Không tìm thấy lịch trình.");
});
