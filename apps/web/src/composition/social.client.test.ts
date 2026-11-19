import { describe, expect, it } from "vitest";
import { social } from "./social.client";

describe("social.client", () => {
  it.each(["useLikeState", "useCommentFeed", "useAddComment", "useRemoveComment"] as const)("lắp đủ %s", (name) => {
    expect(typeof social[name]).toBe("function");
  });
});
