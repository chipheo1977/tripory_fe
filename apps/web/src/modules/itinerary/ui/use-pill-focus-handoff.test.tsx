import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { resetPillFocusTracking } from "./use-pill-focus-handoff";
import { ViewModeToggle } from "./view-mode-toggle";

const pill = (id: string) => (
  <div id={id}>
    <ViewModeToggle onViewChange={vi.fn()} variant="inline" view="article" />
  </div>
);

const PLACEMENTS = {
  a: () => pill("A"),
  b: () => pill("B"),
  none: () => <button type="button">Nút khác</button>,
} as const;

function Harness({ placement }: Readonly<{ placement: keyof typeof PLACEMENTS }>) {
  const Place = PLACEMENTS[placement];
  return <Place />;
}

// Cho `setTimeout(0)` của lần nhận focus chạy xong.
const nextTick = () =>
  act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });

beforeEach(() => {
  resetPillFocusTracking();
  document.body.innerHTML = "";
});

describe("usePillFocusHandoff", () => {
  it("moves focus to the selected segment of the new pill when the focused pill is replaced", async () => {
    const { rerender } = render(<Harness placement="a" />);
    screen.getByRole("button", { name: "Bản đồ" }).focus();
    expect(document.activeElement?.textContent).toBe("Bản đồ");

    rerender(<Harness placement="b" />);
    await nextTick();

    const active = document.activeElement as HTMLElement;
    expect(active.closest("#B")).not.toBeNull();
    expect(active.getAttribute("aria-pressed")).toBe("true");
    expect(active.textContent).toBe("Bài viết");
  });

  it("keeps arrow-key navigation working on the pill that received the focus", async () => {
    const user = userEvent.setup();
    resetPillFocusTracking();
    const { rerender } = render(<Harness placement="a" />);
    screen.getByRole("button", { name: "Bản đồ" }).focus();
    rerender(<Harness placement="b" />);
    await nextTick();
    expect(document.activeElement?.textContent).toBe("Bài viết");

    await user.keyboard("{ArrowRight}");

    expect(document.activeElement?.textContent).toBe("Bản đồ");
  });

  it("does not steal focus when focus was outside every pill", () => {
    const { rerender } = render(<Harness placement="none" />);
    screen.getByRole("button", { name: "Nút khác" }).focus();

    rerender(<Harness placement="b" />);

    expect(document.activeElement?.closest("#B")).toBeNull();
  });

  it("does not focus anything on the very first mount of a page", () => {
    render(<Harness placement="a" />);

    expect(document.activeElement).toBe(document.body);
  });

  it("does not steal focus while another pill still holds it, and hands it over when that pill goes away", () => {
    const { rerender } = render(<div key="a">{pill("A")}</div>);
    screen.getByRole("button", { name: "Bản đồ" }).focus();

    rerender(
      <>
        <div key="a">{pill("A")}</div>
        <div key="a2">{pill("A2")}</div>
      </>,
    );
    expect(document.activeElement?.closest("#A")).not.toBeNull();

    rerender(<div key="a2">{pill("A2")}</div>);
    const active = document.activeElement as HTMLElement;
    expect(active.closest("#A2")).not.toBeNull();
    expect(active.getAttribute("aria-pressed")).toBe("true");
  });

  it("does not carry a stale hand-off to a later, unrelated mount", () => {
    vi.useFakeTimers();
    try {
      const { unmount } = render(<Harness placement="a" />);
      screen.getByRole("button", { name: "Bản đồ" }).focus();
      unmount();
      vi.advanceTimersByTime(1000);

      render(<Harness placement="b" />);

      expect(document.activeElement).toBe(document.body);
    } finally {
      vi.useRealTimers();
    }
  });
});
