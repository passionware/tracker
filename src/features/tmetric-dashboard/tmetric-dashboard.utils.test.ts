import type { GenericReport } from "@/services/io/_common/GenericReport";
import { describe, expect, it } from "vitest";

function testTimeEntry(
  fields: Pick<
    GenericReport["timeEntries"][number],
    "roleId" | "projectId" | "activityId" | "taskId" | "startAt" | "endAt"
  > & { id?: string; contractorId?: number },
): GenericReport["timeEntries"][number] {
  const { startAt } = fields;
  return {
    id: fields.id ?? "test-entry",
    note: null,
    contractorId: fields.contractorId ?? 0,
    createdAt: startAt,
    updatedAt: startAt,
    ...fields,
  };
}
import {
  formatContractorRateGroupFallbackCaption,
} from "./ContractorIterationRowLabel";
import {
  contractorIdsWithMultipleRateRows,
  findReportProjectIdsByIterationAndProject,
  getContractorIterationTotals,
  getContractorRatesForIterationProject,
  resolveRateGroupProjectLabel,
} from "./tmetric-dashboard.utils";

describe("getContractorRatesForIterationProject (explicit multi report projects)", () => {
  it("lists contractors when rates use a different report project id than the first match", () => {
    const report: GenericReport = {
      definitions: {
        taskTypes: {},
        activityTypes: {},
        projectTypes: {
          first: {
            name: "First logical project",
            description: "",
            parameters: {
              projectId: "99",
              iterationId: "35",
            },
          },
          second: {
            name: "Second logical project",
            description: "",
            parameters: {
              projectId: "99",
              iterationId: "35",
            },
          },
        },
        roleTypes: {
          iter_35_contractor_7: {
            name: "c7",
            description: "",
            rates: [
              {
                billing: "hourly",
                activityTypes: [],
                taskTypes: [],
                projectIds: ["second"],
                costRate: 10,
                costCurrency: "EUR",
                billingRate: 20,
                billingCurrency: "EUR",
              },
            ],
          },
        },
      },
      timeEntries: [],
    };

    const ids = findReportProjectIdsByIterationAndProject(report, 35, 99);
    expect(ids).toEqual(["first", "second"]);

    const rows = getContractorRatesForIterationProject(report, 35, 99);
    expect(rows).toHaveLength(1);
    expect(rows[0].contractorId).toBe(7);
    expect(rows[0].costRate).toBe(10);
  });
});

describe("getContractorIterationTotals", () => {
  it("returns one row per contractor when all entries share the same rate", () => {
    const start = new Date("2026-05-01T09:00:00Z");
    const end = new Date("2026-05-01T11:00:00Z");
    const report: GenericReport = {
      definitions: {
        taskTypes: {},
        activityTypes: {},
        projectTypes: {},
        roleTypes: {
          iter_29_contractor_3: {
            name: "c3",
            description: "",
            rates: [
              {
                billing: "hourly",
                activityTypes: [],
                taskTypes: [],
                projectIds: [],
                costRate: 115,
                costCurrency: "EUR",
                billingRate: 115,
                billingCurrency: "EUR",
              },
            ],
          },
        },
      },
      timeEntries: [
        testTimeEntry({
          roleId: "iter_29_contractor_3",
          projectId: "p1",
          activityId: "a1",
          taskId: "t1",
          startAt: start,
          endAt: end,
        }),
      ],
    };

    const rows = getContractorIterationTotals(report, 29);
    expect(rows).toHaveLength(1);
    expect(rows[0].contractorId).toBe(3);
    expect(rows[0].costRate).toBe(115);
    expect(rows[0].hours).toBe(2);
    expect(rows[0].totalCost).toBe(230);
  });

  it("returns separate rows per contractor when matched rates differ", () => {
    const report: GenericReport = {
      definitions: {
        taskTypes: {},
        activityTypes: {},
        projectTypes: {},
        roleTypes: {
          iter_29_contractor_3: {
            name: "c3",
            description: "",
            rates: [
              {
                billing: "hourly",
                activityTypes: [],
                taskTypes: [],
                projectIds: [],
                costRate: 100,
                costCurrency: "EUR",
                billingRate: 100,
                billingCurrency: "EUR",
              },
              {
                billing: "hourly",
                activityTypes: [],
                taskTypes: ["premium"],
                projectIds: [],
                costRate: 115,
                costCurrency: "EUR",
                billingRate: 115,
                billingCurrency: "EUR",
              },
            ],
          },
        },
      },
      timeEntries: [
        testTimeEntry({
          roleId: "iter_29_contractor_3",
          projectId: "p1",
          activityId: "a1",
          taskId: "standard",
          startAt: new Date("2026-05-01T09:00:00Z"),
          endAt: new Date("2026-05-01T11:00:00Z"),
        }),
        testTimeEntry({
          roleId: "iter_29_contractor_3",
          projectId: "p1",
          activityId: "a1",
          taskId: "premium",
          startAt: new Date("2026-05-02T09:00:00Z"),
          endAt: new Date("2026-05-02T12:30:00Z"),
        }),
      ],
    };

    const rows = getContractorIterationTotals(report, 29);
    expect(rows).toHaveLength(2);
    expect(rows.every((r) => r.contractorId === 3)).toBe(true);
    expect(rows.map((r) => r.costRate).sort((a, b) => a - b)).toEqual([
      100, 115,
    ]);
    expect(rows.find((r) => r.costRate === 100)?.hours).toBe(2);
    expect(rows.find((r) => r.costRate === 115)?.hours).toBe(3.5);
  });

  it("contractorIdsWithMultipleRateRows flags only duplicated contractors", () => {
    const rows = getContractorIterationTotals(
      {
        definitions: {
          taskTypes: {},
          activityTypes: {},
          projectTypes: {},
          roleTypes: {
            iter_1_contractor_1: {
              name: "c1",
              description: "",
              rates: [
                {
                  billing: "hourly",
                  activityTypes: [],
                  taskTypes: [],
                  projectIds: [],
                  costRate: 10,
                  costCurrency: "EUR",
                  billingRate: 10,
                  billingCurrency: "EUR",
                },
                {
                  billing: "hourly",
                  activityTypes: [],
                  taskTypes: ["x"],
                  projectIds: [],
                  costRate: 20,
                  costCurrency: "EUR",
                  billingRate: 20,
                  billingCurrency: "EUR",
                },
              ],
            },
            iter_1_contractor_2: {
              name: "c2",
              description: "",
              rates: [
                {
                  billing: "hourly",
                  activityTypes: [],
                  taskTypes: [],
                  projectIds: [],
                  costRate: 5,
                  costCurrency: "EUR",
                  billingRate: 5,
                  billingCurrency: "EUR",
                },
              ],
            },
          },
        },
        timeEntries: [
          testTimeEntry({
            roleId: "iter_1_contractor_1",
            projectId: "p",
            activityId: "a",
            taskId: "a",
            startAt: new Date("2026-05-01T09:00:00Z"),
            endAt: new Date("2026-05-01T10:00:00Z"),
          }),
          testTimeEntry({
            roleId: "iter_1_contractor_1",
            projectId: "p",
            activityId: "a",
            taskId: "x",
            startAt: new Date("2026-05-01T11:00:00Z"),
            endAt: new Date("2026-05-01T12:00:00Z"),
          }),
          testTimeEntry({
            roleId: "iter_1_contractor_2",
            projectId: "p",
            activityId: "a",
            taskId: "a",
            startAt: new Date("2026-05-01T09:00:00Z"),
            endAt: new Date("2026-05-01T10:00:00Z"),
          }),
        ],
      },
      1,
    );
    const multi = contractorIdsWithMultipleRateRows(rows);
    expect(multi.has(1)).toBe(true);
    expect(multi.has(2)).toBe(false);
  });
});

describe("formatContractorRateGroupFallbackCaption", () => {
  const formatService = {
    financial: {
      amountText: (n: number, c: string) => `${c} ${n}`,
    },
  } as Parameters<typeof formatContractorRateGroupFallbackCaption>[0];

  it("uses a single /h label when cost and billing rates match", () => {
    expect(
      formatContractorRateGroupFallbackCaption(formatService, {
        costRate: 115,
        costCurrency: "EUR",
        billingRate: 115,
        billingCurrency: "EUR",
      }),
    ).toBe("EUR 115/h");
  });

  it("shows both rates when cost and billing differ", () => {
    expect(
      formatContractorRateGroupFallbackCaption(formatService, {
        costRate: 125,
        costCurrency: "PLN",
        billingRate: 45,
        billingCurrency: "EUR",
      }),
    ).toBe("PLN 125/h cost · EUR 45/h bill");
  });
});

describe("resolveRateGroupProjectLabel", () => {
  const report: GenericReport = {
    definitions: {
      taskTypes: {},
      activityTypes: {},
      projectTypes: {
        gold: { name: "Passionware Gold", description: "", parameters: {} },
        support: { name: "Support line", description: "", parameters: {} },
      },
      roleTypes: {},
    },
    timeEntries: [],
  };

  it("prefers names from rate.projectIds when set", () => {
    expect(
      resolveRateGroupProjectLabel(report, ["gold"], []),
    ).toBe("Passionware Gold");
  });

  it("falls back to entry project ids when rate is not project-scoped", () => {
    expect(
      resolveRateGroupProjectLabel(report, [], ["support"]),
    ).toBe("Support line");
  });
});

describe("getContractorIterationTotals rateProjectLabel", () => {
  it("attaches TMetric project names from entries", () => {
    const report: GenericReport = {
      definitions: {
        taskTypes: {},
        activityTypes: {},
        projectTypes: {
          p1: { name: "Client Portal", description: "", parameters: {} },
        },
        roleTypes: {
          iter_29_contractor_1: {
            name: "c1",
            description: "",
            rates: [
              {
                billing: "hourly",
                activityTypes: [],
                taskTypes: [],
                projectIds: [],
                costRate: 10,
                costCurrency: "EUR",
                billingRate: 10,
                billingCurrency: "EUR",
              },
            ],
          },
        },
      },
      timeEntries: [
        testTimeEntry({
          roleId: "iter_29_contractor_1",
          projectId: "p1",
          activityId: "a",
          taskId: "t",
          startAt: new Date("2026-05-01T09:00:00Z"),
          endAt: new Date("2026-05-01T10:00:00Z"),
        }),
      ],
    };
    expect(getContractorIterationTotals(report, 29)[0].rateProjectLabel).toBe(
      "Client Portal",
    );
  });
});
