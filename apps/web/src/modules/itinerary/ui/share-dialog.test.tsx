import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ShareButton } from "./share-button";
import { ShareDialog, type ShareDialogProps } from "./share-dialog";

const h = vi.hoisted(() => ({ download: vi.fn() }));

vi.mock("./use-qr-download", () => ({ useQrDownload: () => ({ download: h.download }) }));

const ID = "3f2a6c1e-8b7d-4e21-9c55-0a1b2c3d4e5f";
const originalMatchMedia = window.matchMedia;

function installMatchMedia(fromMd: boolean) {
  window.matchMedia = ((query: string) =>
    ({
      matches: fromMd && query.includes("768px"),
      media: query,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    }) as unknown as MediaQueryList) as typeof window.matchMedia;
}

beforeEach(() => {
  h.download.mockReset().mockResolvedValue("ok");
  installMatchMedia(true);
});

afterEach(() => {
  window.matchMedia = originalMatchMedia;
});

const setup = (overrides: Partial<ShareDialogProps> = {}) => {
  const onOpenChange = vi.fn();
  const onOpenChangeComplete = vi.fn();
  render(
    <ShareDialog
      itineraryId={ID}
      onOpenChange={onOpenChange}
      onOpenChangeComplete={onOpenChangeComplete}
      open
      showPublicLink={false}
      title="Hội An"
      {...overrides}
    />,
  );
  return { onOpenChange, onOpenChangeComplete };
};

describe.each([
  ["Dialog (from md)", true],
  ["Sheet (below md)", false],
])("ShareDialog as %s", (_name, fromMd) => {
  beforeEach(() => installMatchMedia(fromMd));

  it("has the title, the description and the full body", async () => {
    setup();

    const dialog = await screen.findByRole("dialog", { name: "Chia sẻ lịch trình" });
    const description = within(dialog).getByText("Ai có link đều xem được lịch trình này.");
    expect(dialog.getAttribute("aria-describedby")).toContain(description.id);
    const input = within(dialog).getByLabelText("Link lịch trình") as HTMLInputElement;
    expect(input.value).toBe(`${window.location.origin}/itineraries/${ID}`);
    expect(input.value).not.toContain("?");
    expect(within(dialog).getByRole("heading", { level: 3, name: "Mã QR" })).toBeTruthy();
    expect(within(dialog).getByRole("img", { name: "Mã QR của link lịch trình" })).toBeTruthy();
    expect(within(dialog).getByText("Quét mã bằng camera điện thoại để mở lịch trình.")).toBeTruthy();
    expect(within(dialog).getByRole("button", { name: "Tải ảnh QR" })).toBeTruthy();
    expect(within(dialog).queryByRole("button", { name: "Hủy" })).toBeNull();
  });

  it("focuses the copy button first", async () => {
    setup();

    await screen.findByRole("dialog");
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole("button", { name: "Sao chép link" })));
  });

  it("hides the public page link unless asked", async () => {
    setup({ showPublicLink: false });

    await screen.findByRole("dialog");
    expect(screen.queryByRole("link", { name: "Mở trang công khai (mở tab mới)" })).toBeNull();
  });

  it("shows a safe public page link when opened from the editor", async () => {
    setup({ showPublicLink: true });

    const link = await screen.findByRole("link", { name: "Mở trang công khai (mở tab mới)" });
    expect(link.getAttribute("href")).toBe(`/itineraries/${ID}`);
    expect(link.getAttribute("target")).toBe("_blank");
    expect(link.getAttribute("rel")).toBe("noopener noreferrer");
    expect(link.textContent).toBe("Mở trang công khai");
  });

  it("downloads the qr under the title-based file name", async () => {
    const user = userEvent.setup();
    setup();

    await user.click(await screen.findByRole("button", { name: "Tải ảnh QR" }));

    expect(h.download).toHaveBeenCalledWith({
      url: `${window.location.origin}/itineraries/${ID}`,
      fileName: "tripory-hoi-an.png",
    });
  });

  it("reports a failed qr download in a polite danger line", async () => {
    const user = userEvent.setup();
    h.download.mockResolvedValue("failed");
    setup();

    await user.click(await screen.findByRole("button", { name: "Tải ảnh QR" }));

    const message = await screen.findByText("Không tải được ảnh QR. Hãy thử lại hoặc chụp màn hình mã QR.");
    expect(message.getAttribute("aria-live")).toBe("polite");
    expect(message.className).toContain("text-danger");
  });

  it("closes from the X button and forwards onOpenChangeComplete", async () => {
    const user = userEvent.setup();
    const { onOpenChange } = setup();

    await user.click(await screen.findByRole("button", { name: "Đóng" }));

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("closes with Escape", async () => {
    const user = userEvent.setup();
    const { onOpenChange } = setup();
    await screen.findByRole("dialog");

    await user.keyboard("{Escape}");

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});

describe("ShareDialog completion callback", () => {
  it("forwards onOpenChangeComplete(false) after closing", async () => {
    const onOpenChangeComplete = vi.fn();
    const { rerender } = render(
      <ShareDialog
        itineraryId={ID}
        onOpenChange={() => undefined}
        onOpenChangeComplete={onOpenChangeComplete}
        open
        showPublicLink={false}
        title="Hội An"
      />,
    );
    await screen.findByRole("dialog");

    rerender(
      <ShareDialog
        itineraryId={ID}
        onOpenChange={() => undefined}
        onOpenChangeComplete={onOpenChangeComplete}
        open={false}
        showPublicLink={false}
        title="Hội An"
      />,
    );

    await waitFor(() => expect(onOpenChangeComplete).toHaveBeenCalledWith(false));
  });
});

function Harness() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <ShareButton onClick={() => setOpen(true)} visible />
      <ShareDialog itineraryId={ID} onOpenChange={setOpen} open={open} showPublicLink={false} title="Hội An" />
    </>
  );
}

describe("ShareButton opens the dialog", () => {
  it("opens on click and returns focus to the button after Escape", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const button = screen.getByRole("button", { name: "Chia sẻ lịch trình" });

    await user.click(button);
    await screen.findByRole("dialog", { name: "Chia sẻ lịch trình" });
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());

    await waitFor(() => expect(document.activeElement).toBe(button));
    await act(async () => undefined);
  });
});
