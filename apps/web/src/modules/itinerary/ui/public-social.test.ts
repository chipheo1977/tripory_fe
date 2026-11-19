import { describe, expect, it } from "vitest";
import { NO_PUBLIC_SOCIAL } from "./public-social";

describe("NO_PUBLIC_SOCIAL", () => {
  it("ba slot đều null", () => {
    expect(NO_PUBLIC_SOCIAL.slots).toEqual({ hero: null, comments: null, overview: null });
  });

  it("wrap trả đúng node", () => {
    const node = { marker: true };
    expect(NO_PUBLIC_SOCIAL.wrap(node as never)).toBe(node);
  });
});
