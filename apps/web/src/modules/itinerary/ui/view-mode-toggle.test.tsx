import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { resetPillFocusTracking } from "./use-pill-focus-handoff";
import { ViewModeToggle, type ViewModeToggleVariant } from "./view-mode-toggle";

// Test trước bấm vào viên thuốc rồi cây bị gỡ khi dọn dẹp; đặt lại để lần mount sau không nhận bàn giao focus còn treo.
beforeEach(() => resetPillFocusTracking());

const setup = (variant: ViewModeToggleVariant = "inline", view: "article" | "map" = "article") => {
  const onViewChange = vi.fn();
  render(<ViewModeToggle onViewChange={onViewChange} variant={variant} view={view} />);
  return { onViewChange };
};

describe("ViewModeToggle", () => {
  it("is a named group marked for focus hand-off, with two segments", () => {
    setup();

    const group = screen.getByRole("group", { name: "Chế độ xem" });
    expect(group.hasAttribute("data-view-mode-toggle")).toBe(true);
    expect(screen.getByRole("button", { name: "Bài viết" }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByRole("button", { name: "Bản đồ" }).getAttribute("aria-pressed")).toBe("false");
  });

  it("calls onViewChange once with map, and not for the current segment", async () => {
    const user = userEvent.setup();
    const { onViewChange } = setup();

    await user.click(screen.getByRole("button", { name: "Bài viết" }));
    expect(onViewChange).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Bản đồ" }));
    expect(onViewChange).toHaveBeenCalledTimes(1);
    expect(onViewChange).toHaveBeenCalledWith("map");
  });

  it("moves focus with the arrow keys without choosing", async () => {
    const user = userEvent.setup();
    const { onViewChange } = setup();

    screen.getByRole("button", { name: "Bài viết" }).focus();
    await user.keyboard("{ArrowRight}");

    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Bản đồ" }));
    expect(onViewChange).not.toHaveBeenCalled();
  });

  it("keeps a touch-sized target and hides the icons below sm", () => {
    setup();

    for (const name of ["Bài viết", "Bản đồ"]) {
      const button = screen.getByRole("button", { name });
      expect(button.className).toContain("min-h-touch");
      const icon = button.querySelector("svg");
      expect(icon?.getAttribute("aria-hidden")).toBe("true");
      expect(icon?.getAttribute("class")).toContain("hidden sm:inline-flex");
    }
  });

  it.each([
    ["inline", ["bg-surface-muted"], ["shadow-overlay"]],
    ["bar", ["bg-surface-muted"], ["shadow-overlay"]],
    ["floating", ["bg-surface-elevated", "shadow-overlay", "pointer-events-auto"], ["bg-surface-muted"]],
    ["dock", ["bg-surface-elevated", "shadow-overlay", "pointer-events-auto"], ["bg-surface-muted"]],
  ] as const)("styles the %s variant", (variant, present, absent) => {
    setup(variant);

    const classes = screen.getByRole("group", { name: "Chế độ xem" }).className.split(/\s+/);
    for (const name of present) expect(classes).toContain(name);
    for (const name of absent) expect(classes).not.toContain(name);
  });
});
