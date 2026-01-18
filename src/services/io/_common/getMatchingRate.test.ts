import { describe, it, expect } from "vitest";
import { getMatchingRate } from "./getMatchingRate";
import { GenericReport, RoleRate } from "./GenericReport";
import { TimeEntry } from "@/features/_common/columns/timeEntry";

describe("getMatchingRate", () => {
  const createMockReport = (rates: RoleRate[]): GenericReport => ({
    definitions: {
      taskTypes: {},
      activityTypes: {},
      projectTypes: {},
      roleTypes: {
        role1: {
          name: "Role 1",
          description: "Test role",
          rates,
        },
      },
    },
    timeEntries: [],
  });

  const createMockEntry = (
    roleId: string,
    activityId: string,
    taskId: string,
    projectId: string,
  ): TimeEntry => ({
    id: "entry1",
    roleId,
    activityId,
    taskId,
    projectId,
    contractorId: 1,
    startAt: new Date("2024-01-01T09:00:00Z"),
    endAt: new Date("2024-01-01T17:00:00Z"),
    createdAt: new Date(),
    updatedAt: new Date(),
    note: null,
  });

  it("should throw error if role type does not exist", () => {
    const report = createMockReport([]);
    const entry = createMockEntry(
      "nonexistent",
      "activity1",
      "task1",
      "project1",
    );

    expect(() => getMatchingRate(report, entry)).toThrow(
      "Role type 'nonexistent' not found in report definitions",
    );
  });

  it("should throw error if no rates match", () => {
    const rates: RoleRate[] = [
      {
        billing: "hourly",
        activityTypes: ["activity2"],
        taskTypes: ["task2"],
        projectIds: [],
        costRate: 50,
        costCurrency: "EUR",
        billingRate: 75,
        billingCurrency: "EUR",
      },
    ];
    const report = createMockReport(rates);
    const entry = createMockEntry("role1", "activity1", "task1", "project1");

    expect(() => getMatchingRate(report, entry)).toThrow(
      "No matching rate found for entry",
    );
  });

  it("should match rate with empty arrays (matches all)", () => {
    const rates: RoleRate[] = [
      {
        billing: "hourly",
        activityTypes: [],
        taskTypes: [],
        projectIds: [],
        costRate: 50,
        costCurrency: "EUR",
        billingRate: 75,
        billingCurrency: "EUR",
      },
    ];
    const report = createMockReport(rates);
    const entry = createMockEntry("role1", "activity1", "task1", "project1");

    const result = getMatchingRate(report, entry);

    expect(result).toEqual(rates[0]);
  });

  it("should match rate with matching activity and task types", () => {
    const rates: RoleRate[] = [
      {
        billing: "hourly",
        activityTypes: ["activity1"],
        taskTypes: ["task1"],
        projectIds: [],
        costRate: 50,
        costCurrency: "EUR",
        billingRate: 75,
        billingCurrency: "EUR",
      },
    ];
    const report = createMockReport(rates);
    const entry = createMockEntry("role1", "activity1", "task1", "project1");

    const result = getMatchingRate(report, entry);

    expect(result).toEqual(rates[0]);
  });

  it("should match rate with matching project ID", () => {
    const rates: RoleRate[] = [
      {
        billing: "hourly",
        activityTypes: [],
        taskTypes: [],
        projectIds: ["project1"],
        costRate: 50,
        costCurrency: "EUR",
        billingRate: 75,
        billingCurrency: "EUR",
      },
    ];
    const report = createMockReport(rates);
    const entry = createMockEntry("role1", "activity1", "task1", "project1");

    const result = getMatchingRate(report, entry);

    expect(result).toEqual(rates[0]);
  });

  it("should return most specific rate when multiple rates match", () => {
    const rates: RoleRate[] = [
      {
        billing: "hourly",
        activityTypes: [],
        taskTypes: [],
        projectIds: [],
        costRate: 30,
        costCurrency: "EUR",
        billingRate: 50,
        billingCurrency: "EUR",
      },
      {
        billing: "hourly",
        activityTypes: ["activity1"],
        taskTypes: [],
        projectIds: [],
        costRate: 40,
        costCurrency: "EUR",
        billingRate: 60,
        billingCurrency: "EUR",
      },
      {
        billing: "hourly",
        activityTypes: ["activity1"],
        taskTypes: ["task1"],
        projectIds: [],
        costRate: 50,
        costCurrency: "EUR",
        billingRate: 75,
        billingCurrency: "EUR",
      },
      {
        billing: "hourly",
        activityTypes: ["activity1"],
        taskTypes: ["task1"],
        projectIds: ["project1"],
        costRate: 60,
        costCurrency: "EUR",
        billingRate: 90,
        billingCurrency: "EUR",
      },
    ];
    const report = createMockReport(rates);
    const entry = createMockEntry("role1", "activity1", "task1", "project1");

    const result = getMatchingRate(report, entry);

    // Should return the most specific rate (all 3 fields specified)
    expect(result).toEqual(rates[3]);
    expect(result?.costRate).toBe(60);
  });

  it("should prefer rate with project ID over rate without when both match", () => {
    const rates: RoleRate[] = [
      {
        billing: "hourly",
        activityTypes: ["activity1"],
        taskTypes: ["task1"],
        projectIds: [],
        costRate: 50,
        costCurrency: "EUR",
        billingRate: 75,
        billingCurrency: "EUR",
      },
      {
        billing: "hourly",
        activityTypes: ["activity1"],
        taskTypes: ["task1"],
        projectIds: ["project1"],
        costRate: 60,
        costCurrency: "EUR",
        billingRate: 90,
        billingCurrency: "EUR",
      },
    ];
    const report = createMockReport(rates);
    const entry = createMockEntry("role1", "activity1", "task1", "project1");

    const result = getMatchingRate(report, entry);

    // Should prefer the rate with project ID (higher specificity)
    expect(result).toEqual(rates[1]);
    expect(result?.costRate).toBe(60);
  });

  it("should not match rate with non-matching project ID", () => {
    const rates: RoleRate[] = [
      {
        billing: "hourly",
        activityTypes: [],
        taskTypes: [],
        projectIds: ["project2"],
        costRate: 50,
        costCurrency: "EUR",
        billingRate: 75,
        billingCurrency: "EUR",
      },
    ];
    const report = createMockReport(rates);
    const entry = createMockEntry("role1", "activity1", "task1", "project1");

    const result = getMatchingRate(report, entry);

    expect(result).toBeUndefined();
  });

  it("should not match rate with non-matching activity type", () => {
    const rates: RoleRate[] = [
      {
        billing: "hourly",
        activityTypes: ["activity2"],
        taskTypes: [],
        projectIds: [],
        costRate: 50,
        costCurrency: "EUR",
        billingRate: 75,
        billingCurrency: "EUR",
      },
    ];
    const report = createMockReport(rates);
    const entry = createMockEntry("role1", "activity1", "task1", "project1");

    const result = getMatchingRate(report, entry);

    expect(result).toBeUndefined();
  });

  it("should not match rate with non-matching task type", () => {
    const rates: RoleRate[] = [
      {
        billing: "hourly",
        activityTypes: [],
        taskTypes: ["task2"],
        projectIds: [],
        costRate: 50,
        costCurrency: "EUR",
        billingRate: 75,
        billingCurrency: "EUR",
      },
    ];
    const report = createMockReport(rates);
    const entry = createMockEntry("role1", "activity1", "task1", "project1");

    const result = getMatchingRate(report, entry);

    expect(result).toBeUndefined();
  });

  it("should handle multiple matching rates with same specificity", () => {
    const rates: RoleRate[] = [
      {
        billing: "hourly",
        activityTypes: ["activity1"],
        taskTypes: ["task1"],
        projectIds: [],
        costRate: 50,
        costCurrency: "EUR",
        billingRate: 75,
        billingCurrency: "EUR",
      },
      {
        billing: "hourly",
        activityTypes: ["activity1"],
        taskTypes: ["task1"],
        projectIds: [],
        costRate: 60,
        costCurrency: "EUR",
        billingRate: 90,
        billingCurrency: "EUR",
      },
    ];
    const report = createMockReport(rates);
    const entry = createMockEntry("role1", "activity1", "task1", "project1");

    const result = getMatchingRate(report, entry);

    // Should return the first one when specificity is equal
    expect(result).toBeDefined();
    expect(result?.costRate).toBe(50);
  });
});
