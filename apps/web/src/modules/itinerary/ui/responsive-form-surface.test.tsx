import { act, fireEvent, render, renderHook, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ResponsiveFormSurface } from "./responsive-form-surface";
import { useMediaQuery } from "./use-media-query";

const WIDE_QUERY = "(min-width: 768px)";

type Listener = () => void;

/** matchMedia giả: `matches` đổi được và phát `change` cho listener đã đăng ký. */
function installMatchMedia(initial: boolean) {
  const state = { matches: initial };
  const listeners = new Set<Listener>();
  const queries: string[] = [];
  const original = window.matchMedia;
  window.matchMedia = ((query: string) => {
    queries.push(query);
    return {
      get matches() {
        return state.matches;
      },
      media: query,
      addEventListener: (_: string, listener: Listener) => listeners.add(listener),
      removeEventListener: (_: string, listener: Listener) => listeners.delete(listener),
    } as unknown as MediaQueryList;
  }) as typeof window.matchMedia;
  return {
    queries,
    listeners,
    set(matches: boolean) {
      state.matches = matches;
      for (const listener of [...listeners]) listener();
    },
    restore() {
      window.matchMedia = original;
    },
  };
}

let media: ReturnType<typeof installMatchMedia>;
afterEach(() => media.restore());

const closes = (fn: ReturnType<typeof vi.fn>) => fn.mock.calls.some(([next]) => next === false);

function setup(props: { wide: boolean; locked?: boolean; onOpenChange?: (open: boolean) => void }) {
  media = installMatchMedia(props.wide);
  const onOpenChange = props.onOpenChange ?? vi.fn();
  render(
    <ResponsiveFormSurface locked={props.locked ?? false} onOpenChange={onOpenChange} open title="Thông tin chuyến đi" titleId="surface-title">
      <p>nội dung form</p>
    </ResponsiveFormSurface>,
  );
  return { onOpenChange: onOpenChange as ReturnType<typeof vi.fn> };
}

describe("useMediaQuery", () => {
  beforeEach(() => {
    media = installMatchMedia(false);
  });

  it("đọc matchMedia và cập nhật khi có change", () => {
    const { result } = renderHook(() => useMediaQuery(WIDE_QUERY));
    expect(result.current).toBe(false);
    expect(media.queries).toContain(WIDE_QUERY);
    act(() => media.set(true));
    expect(result.current).toBe(true);
  });

  it("gỡ listener khi unmount", () => {
    const { unmount } = renderHook(() => useMediaQuery(WIDE_QUERY));
    expect(media.listeners.size).toBe(1);
    unmount();
    expect(media.listeners.size).toBe(0);
  });
});

describe("ResponsiveFormSurface", () => {
  it("từ md render Dialog với tiêu đề và không có nút của Sheet", async () => {
    setup({ wide: true });
    const dialog = await screen.findByRole("dialog", { name: "Thông tin chuyến đi" });
    expect(dialog.getAttribute("data-sheet-position")).toBeNull();
    expect(screen.getByText("nội dung form")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Đóng bảng" })).toBeNull();
    // Dialog desktop không có nút X tự động (đóng bằng Esc hoặc nút "Hủy" của form); chỉ Sheet modal có.
    expect(screen.queryByRole("button", { name: "Đóng" })).toBeNull();
    expect(document.getElementById("surface-title")?.textContent).toBe("Thông tin chuyến đi");
  });

  it("dưới md Sheet có nút X: bấm gọi onOpenChange(false)", async () => {
    const user = userEvent.setup();
    const { onOpenChange } = setup({ wide: false });
    await screen.findByRole("dialog");
    const button = screen.getByRole("button", { name: "Đóng" }) as HTMLButtonElement;
    expect(button.disabled).toBe(false);

    await user.click(button);

    expect(closes(onOpenChange)).toBe(true);
  });

  it("dưới md khi locked nút X bị vô hiệu và bấm không đóng", async () => {
    const user = userEvent.setup();
    const { onOpenChange } = setup({ wide: false, locked: true });
    await screen.findByRole("dialog");
    const button = screen.getByRole("button", { name: "Đóng" }) as HTMLButtonElement;
    expect(button.disabled).toBe(true);

    await user.click(button);
    fireEvent.click(button);

    expect(closes(onOpenChange)).toBe(false);
    expect(screen.getByRole("dialog")).toBeTruthy();
  });

  it("dưới md render Sheet modal ở mức expanded với SheetTitle", async () => {
    setup({ wide: false });
    const sheet = await screen.findByRole("dialog", { name: "Thông tin chuyến đi" });
    expect(sheet.getAttribute("data-sheet-position")).toBe("bottom");
    expect(screen.getByText("nội dung form")).toBeTruthy();
    expect(document.getElementById("surface-title")?.textContent).toBe("Thông tin chuyến đi");
    expect(document.querySelector("[data-sheet-backdrop]")).not.toBeNull();
    for (const name of ["Thu gọn bảng", "Mở rộng bảng", "Đóng bảng"]) {
      expect(screen.queryByRole("button", { name })).toBeNull();
    }
  });

  it.each([true, false])("không đóng khi bấm scrim (wide=%s)", async (wide) => {
    const user = userEvent.setup();
    const { onOpenChange } = setup({ wide });
    await screen.findByRole("dialog");
    const backdrop = document.querySelector(wide ? "[data-dialog-backdrop]" : "[data-sheet-backdrop]") as HTMLElement;
    await user.click(backdrop);
    expect(closes(onOpenChange)).toBe(false);
    expect(screen.getByRole("dialog")).toBeTruthy();
  });

  it.each([true, false])("Esc đóng khi không khóa (wide=%s)", async (wide) => {
    const user = userEvent.setup();
    const { onOpenChange } = setup({ wide });
    await screen.findByRole("dialog");
    await user.keyboard("{Escape}");
    expect(closes(onOpenChange)).toBe(true);
  });

  it.each([true, false])("locked: Esc không đóng (wide=%s)", async (wide) => {
    const user = userEvent.setup();
    const { onOpenChange } = setup({ wide, locked: true });
    await screen.findByRole("dialog");
    await user.keyboard("{Escape}");
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    expect(closes(onOpenChange)).toBe(false);
    expect(screen.getByRole("dialog")).toBeTruthy();
  });
});
