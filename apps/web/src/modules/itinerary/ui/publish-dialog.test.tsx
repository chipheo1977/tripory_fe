import { makeApiError } from "@tripory/api-client";
import { parseItineraryId } from "@tripory/shared-kernel";
import { notify } from "@tripory/ui-web";
import { QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { makeQueryClient } from "@/composition/query-client";
import { PublishDialog } from "./publish-dialog";
import { createSaveStatusStore, SaveStatusProvider } from "./save-status";

const h = vi.hoisted(() => ({ publish: vi.fn() }));

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
        publish: (id: string) => h.publish(id),
        remove: unused,
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

const http = (status: number, code: string | null, message: string | null) =>
  makeApiError({ kind: "http", status, code, message });

const confirmButton = () => screen.getByRole("button", { name: /^Xuất bản$|Đang xuất bản/ });

function setup(open = true) {
  const user = userEvent.setup();
  const store = createSaveStatusStore();
  const onOpenChange = vi.fn();
  const onPublished = vi.fn();
  render(
    <QueryClientProvider client={makeQueryClient()}>
      <SaveStatusProvider store={store}>
        <PublishDialog itineraryId={ID as NonNullable<typeof ID>} onOpenChange={onOpenChange} onPublished={onPublished} open={open} />
      </SaveStatusProvider>
    </QueryClientProvider>,
  );
  return { user, store, onOpenChange, onPublished };
}

beforeEach(() => {
  vi.clearAllMocks();
  h.publish.mockResolvedValue(undefined);
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

it("renders nothing while closed", () => {
  setup(false);
  expect(screen.queryByRole("dialog")).toBeNull();
});

it("asks with the exact D-39 copy", async () => {
  setup();
  const dialog = await screen.findByRole("dialog", { name: "Xuất bản lịch trình?" });
  expect(dialog.textContent).toContain(
    "Ai có link đều xem được lịch trình này. Bạn vẫn sửa được nội dung sau khi xuất bản, nhưng không thể chuyển lại về nháp.",
  );
});

it("puts the initial focus on Hủy, not on the primary button", async () => {
  setup();
  const cancel = await screen.findByRole("button", { name: "Hủy" });
  await waitFor(() => expect(document.activeElement).toBe(cancel));
  expect(confirmButton().className).toContain("bg-primary");
});

it("has no share dialog or share button (D-40)", async () => {
  setup();
  const dialog = await screen.findByRole("dialog");
  expect(dialog.textContent).not.toMatch(/Chia sẻ/);
  expect(screen.queryByRole("button", { name: /Chia sẻ|Sao chép/ })).toBeNull();
});

it("publishes, reports success once, toasts once, marks saved and closes", async () => {
  const success = vi.spyOn(notify, "success");
  const { user, store, onPublished, onOpenChange } = setup();
  await user.click(await screen.findByRole("button", { name: "Xuất bản" }));
  await waitFor(() => expect(onPublished).toHaveBeenCalledTimes(1));
  expect(h.publish).toHaveBeenCalledWith(ID);
  expect(onOpenChange).toHaveBeenCalledWith(false);
  expect(success).toHaveBeenCalledTimes(1);
  expect(success).toHaveBeenCalledWith("Đã xuất bản lịch trình");
  expect(store.getSnapshot().hasSaved).toBe(true);
});

it("cancels without calling the server", async () => {
  const { user, onOpenChange, onPublished } = setup();
  await user.click(await screen.findByRole("button", { name: "Hủy" }));
  expect(onOpenChange).toHaveBeenCalledWith(false);
  expect(h.publish).not.toHaveBeenCalled();
  expect(onPublished).not.toHaveBeenCalled();
});

it("locks while pending: busy label, no second call, Hủy and Esc do not close", async () => {
  let resolve: () => void = () => undefined;
  h.publish.mockReturnValue(new Promise<void>((r) => (resolve = r)));
  const { onOpenChange, onPublished } = setup();
  await screen.findByRole("dialog");
  vi.useFakeTimers();
  fireEvent.click(confirmButton());
  await act(() => vi.advanceTimersByTimeAsync(0));

  const busy = screen.getByRole("button", { name: /Đang xuất bản/ });
  expect(busy.getAttribute("aria-busy")).toBe("true");
  expect(busy.textContent).toBe("Đang xuất bản…");
  fireEvent.click(busy);
  const cancel = screen.getByRole("button", { name: "Hủy" }) as HTMLButtonElement;
  expect(cancel.hasAttribute("disabled") || cancel.getAttribute("aria-disabled") === "true").toBe(true);
  fireEvent.click(cancel);
  fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
  await act(() => vi.advanceTimersByTimeAsync(0));
  expect(h.publish).toHaveBeenCalledTimes(1);
  expect(onOpenChange).not.toHaveBeenCalled();

  await act(() => vi.advanceTimersByTimeAsync(5_000));
  expect(screen.getByText("Máy chủ đang khởi động, có thể mất tới 30 giây…")).toBeTruthy();

  await act(async () => resolve());
  expect(onPublished).toHaveBeenCalledTimes(1);
});

it("shows a failure in an InlineAlert inside the dialog, without an error toast, and allows a retry", async () => {
  const errorToast = vi.spyOn(notify, "error");
  h.publish.mockRejectedValueOnce(http(500, null, null));
  const { user, store, onPublished, onOpenChange } = setup();
  await user.click(await screen.findByRole("button", { name: "Xuất bản" }));
  const alert = await screen.findByRole("alert");
  expect(screen.getByRole("dialog").contains(alert)).toBe(true);
  expect(onPublished).not.toHaveBeenCalled();
  expect(onOpenChange).not.toHaveBeenCalled();
  expect(errorToast).not.toHaveBeenCalled();
  expect(store.getSnapshot().hasSaved).toBe(false);

  await user.click(screen.getByRole("button", { name: "Xuất bản" }));
  await waitFor(() => expect(onPublished).toHaveBeenCalledTimes(1));
  expect(screen.queryByRole("alert")).toBeNull();
});

it("maps Itinerary.CannotPublishEmpty to its curated sentence inside the dialog", async () => {
  h.publish.mockRejectedValue(http(400, "Itinerary.CannotPublishEmpty", "x"));
  const { user, onPublished } = setup();
  await user.click(await screen.findByRole("button", { name: "Xuất bản" }));
  const alert = await screen.findByRole("alert");
  expect(alert.textContent).toBe("Thêm ít nhất 1 điểm đến để xuất bản.");
  expect(screen.getByRole("dialog").contains(alert)).toBe(true);
  expect(onPublished).not.toHaveBeenCalled();
});
