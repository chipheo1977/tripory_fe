import { describe, expect, it } from "vitest";
import { qrFileName } from "./qr-file-name";

const ID = "3f2a6c1e-8b7d-4e21-9c55-0a1b2c3d4e5f";

describe("qrFileName", () => {
  it("strips Vietnamese diacritics and punctuation", () => {
    expect(qrFileName("Đà Nẵng – Hội An 3 ngày!", ID)).toBe("tripory-da-nang-hoi-an-3-ngay.png");
  });

  it("maps đ and Đ to d", () => {
    expect(qrFileName("đồng Đội", ID)).toBe("tripory-dong-doi.png");
  });

  it.each(["   ", "", "!!!", "—–"])("falls back to the id when the title %j has no usable characters", (title) => {
    expect(qrFileName(title, ID)).toBe(`tripory-${ID}.png`);
  });

  it("cuts the slug at 60 characters without a trailing dash", () => {
    const name = qrFileName("a".repeat(100), ID);

    expect(name).toBe(`tripory-${"a".repeat(60)}.png`);
  });

  it("does not leave a trailing dash when the cut lands on a separator", () => {
    const title = `${"a".repeat(59)} bbbb`;

    expect(qrFileName(title, ID)).toBe(`tripory-${"a".repeat(59)}.png`);
  });

  it("never emits two dashes in a row", () => {
    expect(qrFileName("a   ---   b", ID)).toBe("tripory-a-b.png");
  });
});
