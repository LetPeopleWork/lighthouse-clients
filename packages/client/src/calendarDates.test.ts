import { describe, expect, it } from "vitest";
import { formatCalendarDay, formatTimestamp } from "./calendarDates";

describe("formatCalendarDay", () => {
  it.each([
    { wire: "2026-10-30", says: "Fri 30 Oct 2026" },
    { wire: "2026-10-30T00:00:00Z", says: "Fri 30 Oct 2026" },
    { wire: "2027-01-01", says: "Fri 1 Jan 2027" },
    { wire: "2028-02-29", says: "Tue 29 Feb 2028" },
  ])("reads $wire as '$says'", ({ wire, says }) => {
    expect(formatCalendarDay(wire)).toBe(says);
  });

  it.each([
    "2026-02-30",
    "2026-13-01",
    "soon",
    "",
    "2026-10-30 extra",
    "2026-10-3",
  ])("gives no day for '%s'", (wire) => {
    expect(formatCalendarDay(wire)).toBeNull();
  });
});

describe("formatTimestamp", () => {
  const inUtc = <T>(body: () => T): T => {
    const readersZone = process.env.TZ;
    process.env.TZ = "UTC";
    try {
      return body();
    } finally {
      if (readersZone === undefined) {
        delete process.env.TZ;
      } else {
        process.env.TZ = readersZone;
      }
    }
  };

  it("reads a moment on the reader's clock", () => {
    expect(inUtc(() => formatTimestamp("2026-10-06T07:14:00Z"))).toBe(
      "Tue 6 Oct 2026, 07:14",
    );
  });

  it("gives no moment for text that is not one", () => {
    expect(formatTimestamp("yesterday")).toBeNull();
  });
});
