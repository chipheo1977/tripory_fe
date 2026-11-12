import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ShareButton } from "./share-button";

const originalMatchMedia = window.matchMedia;

type Listener = () => void;

function installMatchMedia(initial: boolean) {
  const state = { fromMd: initial };
  const listeners = new Set<Listener>();
  window.matchMedia = ((query: string) =>
    ({
      get matches() {
        return state.fromMd && query.includes("768px");
      },
      media: query,
      addEventListener: (_: string, listener: Listener) => listeners.add(listener),
      removeEventListener: (_: string, listener: Listener) => listeners.delete(listener),
    }) as unknown as MediaQueryList) as typeof window.matchMedia;
  return {
    set(next: boolean) {
      state.fromMd = next;
      for (const listener of [...listeners]) listener();
    },
  };
}

afterEach(() => {
  window.matchMedia = originalMatchMedia;
});

describe("ShareButton", () => {
  it("has the accessible name whatever the breakpoint", () => {
    installMatchMedia(false);
    render(<ShareButton onClick={() => undefined} visible />);

    expect(screen.getByRole("button", { name: "Chia sẻ lịch trình" })).toBeTruthy();
  });

  it("is icon-only below md and shows the label from md", () => {
    const media = installMatchMedia(false);
    render(<ShareButton onClick={() => undefined} visible />);
    const label = screen.getByText("Chia sẻ");
    expect(label.className).toContain("sr-only");
    expect(label.className).toContain("md:not-sr-only");

    media.set(true);
    expect(screen.getByRole("button").className).not.toBe("");
  });

  it("keeps the same DOM node when the breakpoint changes (no remount)", async () => {
    const media = installMatchMedia(false);
    render(<ShareButton onClick={() => undefined} visible />);
    const before = screen.getByRole("button", { name: "Chia sẻ lịch trình" });
    const ghostClass = before.className;

    media.set(true);

    const after = await screen.findByRole("button", { name: "Chia sẻ lịch trình" });
    expect(after).toBe(before);
    expect(after.className).not.toBe(ghostClass);
  });

  it("does not use the accent colour (U-08)", () => {
    installMatchMedia(true);
    render(<ShareButton onClick={() => undefined} visible />);

    expect(screen.getByRole("button").className).not.toContain("bg-primary");
  });

  it("renders nothing when not visible (owner viewing a draft, D-17)", () => {
    installMatchMedia(true);
    const { container } = render(<ShareButton onClick={() => undefined} visible={false} />);

    expect(container.firstChild).toBeNull();
  });

  it("calls onClick exactly once per click", async () => {
    installMatchMedia(true);
    const onClick = vi.fn();
    render(<ShareButton onClick={onClick} visible />);

    await userEvent.setup().click(screen.getByRole("button", { name: "Chia sẻ lịch trình" }));

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("forwards the button ref", () => {
    installMatchMedia(true);
    const ref = { current: null as HTMLButtonElement | null };
    render(<ShareButton buttonRef={ref} onClick={() => undefined} visible />);

    expect(ref.current).toBe(screen.getByRole("button"));
  });
});
