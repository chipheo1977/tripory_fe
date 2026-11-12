import { describe, expect, it } from "vitest";
import { qrMatrix } from "./qr-matrix";

const URL_A = "https://site.test/itineraries/abc";

describe("qrMatrix", () => {
  it("returns a square matrix of the reported size", () => {
    const { size, rows } = qrMatrix(URL_A);

    expect(rows).toHaveLength(size);
    for (const row of rows) expect(row).toHaveLength(size);
  });

  it("is at least a version 1 symbol plus the 2-module border on each side", () => {
    expect(qrMatrix(URL_A).size).toBeGreaterThanOrEqual(21 + 2 * 2);
  });

  it("keeps the 2-module border light on all four sides", () => {
    const { size, rows } = qrMatrix(URL_A);
    const last = size - 1;

    for (let i = 0; i < size; i += 1) {
      for (const edge of [0, 1, last - 1, last]) {
        expect(rows[edge]?.[i]).toBe(false);
        expect(rows[i]?.[edge]).toBe(false);
      }
    }
  });

  it("has dark modules", () => {
    expect(qrMatrix(URL_A).rows.some((row) => row.some(Boolean))).toBe(true);
  });

  it("is deterministic for the same url and differs for another url", () => {
    expect(qrMatrix(URL_A)).toEqual(qrMatrix(URL_A));
    expect(qrMatrix("https://site.test/itineraries/xyz")).not.toEqual(qrMatrix(URL_A));
  });
});
