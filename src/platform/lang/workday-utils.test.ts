import { describe, expect, it } from "vitest";
import { inclusiveWeekdayCount } from "./workday-utils";

describe("inclusiveWeekdayCount", () => {
  it("counts Mon–Fri and skips Sat–Sun", () => {
    const mon = Date.parse("2026-05-04T12:00:00");
    const sun = Date.parse("2026-05-10T23:59:00");
    expect(inclusiveWeekdayCount(mon, sun)).toBe(5);
  });

  it("returns 1 for the same weekday", () => {
    const wed = Date.parse("2026-05-06T18:00:00");
    expect(inclusiveWeekdayCount(wed, wed)).toBe(1);
  });
});
