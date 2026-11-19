import { describe, expect, it } from "vitest";
import { isSubmitShortcut } from "./submit-shortcut";

const event = (overrides: Partial<Parameters<typeof isSubmitShortcut>[0]> = {}) => ({
  key: "Enter",
  ctrlKey: false,
  metaKey: false,
  isComposing: false,
  ...overrides,
});

describe("isSubmitShortcut", () => {
  it("Ctrl+Enter gửi", () => {
    expect(isSubmitShortcut(event({ ctrlKey: true }))).toBe(true);
  });
  it("Cmd+Enter gửi", () => {
    expect(isSubmitShortcut(event({ metaKey: true }))).toBe(true);
  });
  it("Enter trơn không gửi", () => {
    expect(isSubmitShortcut(event())).toBe(false);
  });
  it("đang ghép dấu (IME) không gửi", () => {
    expect(isSubmitShortcut(event({ ctrlKey: true, isComposing: true }))).toBe(false);
  });
  it("phím khác không gửi", () => {
    expect(isSubmitShortcut(event({ key: "a", ctrlKey: true }))).toBe(false);
  });
  it("Shift+Enter không gửi", () => {
    const shiftEnter = { ...event(), shiftKey: true };
    expect(isSubmitShortcut(shiftEnter)).toBe(false);
  });
});
