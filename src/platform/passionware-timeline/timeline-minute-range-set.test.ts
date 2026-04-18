import { describe, expect, it } from "vitest";
import {
  differenceMinuteRanges,
  unionMinuteRanges,
} from "./timeline-minute-range-set.ts";

describe("timeline-minute-range-set", () => {
  it("unions overlapping and touching ranges", () => {
    const out = unionMinuteRanges([
      { start: 10, end: 20 },
      { start: 20, end: 30 },
      { start: 5, end: 8 },
      { start: 7, end: 12 },
    ]);
    expect(out).toEqual([
      { start: 5, end: 30 },
    ]);
  });

  it("subtracts blockers from source", () => {
    const out = differenceMinuteRanges(
      [{ start: 0, end: 100 }],
      [
        { start: 10, end: 20 },
        { start: 40, end: 60 },
      ],
    );
    expect(out).toEqual([
      { start: 0, end: 10 },
      { start: 20, end: 40 },
      { start: 60, end: 100 },
    ]);
  });
});
