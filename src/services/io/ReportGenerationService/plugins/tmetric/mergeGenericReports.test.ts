import type { GenericReport } from "@/services/io/_common/GenericReport";
import { getMatchingRate } from "@/services/io/_common/getMatchingRate";
import { describe, expect, it } from "vitest";
import { mergeGenericReports } from "./TmetricPlugin";

const hourlyRate = (
  projectIds: string[],
): GenericReport["definitions"]["roleTypes"][string]["rates"][number] => ({
  billing: "hourly",
  activityTypes: [],
  taskTypes: [],
  projectIds,
  costRate: 10,
  costCurrency: "EUR",
  billingRate: 20,
  billingCurrency: "EUR",
});

describe("mergeGenericReports", () => {
  it("concatenates role rates for the same role key instead of overwriting", () => {
    const base = new Date("2026-05-02T10:00:00Z");
    const entry = (projectId: string): GenericReport["timeEntries"][number] => ({
      id: "e1",
      note: null,
      taskId: "t22",
      activityId: "a1",
      projectId,
      roleId: "iter_42_contractor_1",
      contractorId: 1,
      createdAt: base,
      updatedAt: base,
      startAt: base,
      endAt: new Date(base.getTime() + 3600_000),
    });

    const r1: GenericReport = {
      definitions: {
        taskTypes: {},
        activityTypes: {},
        projectTypes: {},
        roleTypes: {
          iter_42_contractor_1: {
            name: "r1",
            description: "",
            rates: [hourlyRate(["go26"])],
          },
        },
      },
      timeEntries: [entry("go26")],
    };

    const r2: GenericReport = {
      definitions: {
        taskTypes: {},
        activityTypes: {},
        projectTypes: {},
        roleTypes: {
          iter_42_contractor_1: {
            name: "r2",
            description: "",
            rates: [hourlyRate(["other_project"])],
          },
        },
      },
      timeEntries: [entry("go26")],
    };

    const merged = mergeGenericReports([r1, r2]);
    expect(merged.definitions.roleTypes.iter_42_contractor_1.rates).toHaveLength(
      2,
    );
    expect(() =>
      getMatchingRate(merged, merged.timeEntries[0]!),
    ).not.toThrow();
    expect(() =>
      getMatchingRate(merged, merged.timeEntries[1]!),
    ).not.toThrow();
  });
});
