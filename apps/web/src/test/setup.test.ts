import { expect, it } from "vitest";

it("khởi tạo môi trường DOM cho app", () => {
  expect(window.matchMedia("(min-width: 1px)").matches).toBe(false);
  expect((globalThis as { BASE_UI_ANIMATIONS_DISABLED?: boolean }).BASE_UI_ANIMATIONS_DISABLED).toBe(true);
});
