import { describe, expect, it } from "vitest";
import { parseDate } from "@internationalized/date";
import { generateSmartReportName } from "./reportNameUtils.ts";

describe("generateSmartReportName", () => {
  it("appends H1 for first half of a single calendar month", () => {
    expect(
      generateSmartReportName({
        clientName: "ACME",
        periodStart: parseDate("2026-04-01"),
        periodEnd: parseDate("2026-04-15"),
      }),
    ).toBe("ACME - April'26 H1");
  });

  it("appends H2 for second half of a single calendar month", () => {
    expect(
      generateSmartReportName({
        clientName: "ACME",
        periodStart: parseDate("2026-04-16"),
        periodEnd: parseDate("2026-04-30"),
      }),
    ).toBe("ACME - April'26 H2");
  });

  it("omits half when the range spans both halves of the same month", () => {
    expect(
      generateSmartReportName({
        clientName: "ACME",
        periodStart: parseDate("2026-04-01"),
        periodEnd: parseDate("2026-04-20"),
      }),
    ).toBe("ACME - April'26");
  });

  it("omits half for a full calendar month", () => {
    expect(
      generateSmartReportName({
        clientName: "ACME",
        periodStart: parseDate("2026-04-01"),
        periodEnd: parseDate("2026-04-30"),
      }),
    ).toBe("ACME - April'26");
  });

  it("omits half when the period crosses calendar months", () => {
    expect(
      generateSmartReportName({
        clientName: "ACME",
        periodStart: parseDate("2026-03-10"),
        periodEnd: parseDate("2026-04-10"),
      }),
    ).toBe("ACME - March'26");
  });

  it("falls back when period is missing", () => {
    expect(
      generateSmartReportName({
        clientName: "ACME",
        periodStart: null,
        periodEnd: null,
        fallback: "ACME - Project - 3",
      }),
    ).toBe("ACME - Project - 3");
  });
});
