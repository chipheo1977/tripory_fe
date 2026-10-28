import type { CalendarDate } from "@tripory/itinerary";
import { describe, expect, it } from "vitest";
import { formatKm, formatStartDate } from "./format";

describe("formatKm", () => {
  it("formats with vi-VN separators and one fraction digit", () => {
    expect(formatKm(12.4)).toBe("12,4 km");
    expect(formatKm(1234.56)).toBe("1.234,6 km");
    expect(formatKm(3)).toBe("3 km");
  });

  it("hides zero and null (D-04)", () => {
    expect(formatKm(0)).toBeNull();
    expect(formatKm(null)).toBeNull();
  });
});

describe("formatStartDate", () => {
  it("builds dd/MM/yyyy from the calendar date string", () => {
    expect(formatStartDate("2026-10-12" as CalendarDate)).toBe("Khởi hành 12/10/2026");
  });

  it("returns null without a date", () => {
    expect(formatStartDate(null)).toBeNull();
  });
});
