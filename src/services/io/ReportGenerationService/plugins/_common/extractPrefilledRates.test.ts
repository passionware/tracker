import { describe, expect, it, vi } from "vitest";
import type { WithExpressionService } from "@/services/front/ExpressionService/ExpressionService";
import type { GenericReport, RoleRate } from "@/services/io/_common/GenericReport";
import {
  REPORT_PROJECT_RATE_SOURCE_EXPLICIT,
  scopeTmetricReportProjectId,
} from "@/services/io/ReportGenerationService/plugins/_common/projectTmetricConfiguration";
import { extractPrefilledRatesFromGenericReport } from "./extractPrefilledRates";

const expressionService = { evaluate: vi.fn() } as unknown as WithExpressionService["expressionService"];

function rateForProjects(projectIds: string[]): RoleRate {
  return {
    billing: "hourly",
    activityTypes: [],
    taskTypes: [],
    projectIds,
    costRate: 40,
    costCurrency: "EUR",
    billingRate: 80,
    billingCurrency: "EUR",
  };
}

function explicitProjectParameters(
  trackerProjectId: number,
  reportProjectId: string,
): Record<string, unknown> {
  return {
    rateSource: REPORT_PROJECT_RATE_SOURCE_EXPLICIT,
    reportProjectId,
    trackerProjectId,
    workspaceId: 10,
    clientId: 20,
  };
}

describe("extractPrefilledRatesFromGenericReport", () => {
  it("skips contractor–project pairs with no rate row when there is no time entry on that project", async () => {
    const fl = scopeTmetricReportProjectId(1, "fl25");
    const go = scopeTmetricReportProjectId(1, "go26");
    const report: GenericReport = {
      definitions: {
        taskTypes: {},
        activityTypes: {},
        projectTypes: {
          [fl]: {
            name: "Flat",
            description: "",
            parameters: explicitProjectParameters(1, "fl25"),
          },
          [go]: {
            name: "Gold",
            description: "",
            parameters: explicitProjectParameters(1, "go26"),
          },
        },
        roleTypes: {
          iter_42_contractor_4: {
            name: "r",
            description: "",
            rates: [rateForProjects([go])],
          },
        },
      },
      timeEntries: [],
    };

    const prefilled = await extractPrefilledRatesFromGenericReport(
      report,
      expressionService,
      { additionalContractorIds: [4] },
    );

    expect(prefilled).toEqual([
      {
        roleId: "iter_42_contractor_4",
        contractorId: 4,
        rates: [rateForProjects([go])],
      },
    ]);
  });

  it("still throws when a time entry needs a project but the role has no matching rate", async () => {
    const fl = scopeTmetricReportProjectId(1, "fl25");
    const go = scopeTmetricReportProjectId(1, "go26");
    const report: GenericReport = {
      definitions: {
        taskTypes: {},
        activityTypes: {},
        projectTypes: {
          [fl]: {
            name: "Flat",
            description: "",
            parameters: explicitProjectParameters(1, "fl25"),
          },
          [go]: {
            name: "Gold",
            description: "",
            parameters: explicitProjectParameters(1, "go26"),
          },
        },
        roleTypes: {
          iter_42_contractor_4: {
            name: "r",
            description: "",
            rates: [rateForProjects([go])],
          },
        },
      },
      timeEntries: [
        {
          id: "e1",
          note: null,
          taskId: "t",
          activityId: "a",
          projectId: fl,
          roleId: "iter_42_contractor_4",
          contractorId: 4,
          createdAt: new Date(0),
          updatedAt: new Date(0),
          startAt: new Date(0),
          endAt: new Date(3600_000),
        },
      ],
    };

    await expect(
      extractPrefilledRatesFromGenericReport(report, expressionService),
    ).rejects.toThrow(/no explicit rate row for contractor 4/);
  });

  it("extracts separate prefilled rows per iteration role key for the same contractor", async () => {
    const fl = scopeTmetricReportProjectId(1, "fl25");
    const go = scopeTmetricReportProjectId(1, "go26");
    const report: GenericReport = {
      definitions: {
        taskTypes: {},
        activityTypes: {},
        projectTypes: {
          [fl]: {
            name: "Flat",
            description: "",
            parameters: explicitProjectParameters(1, "fl25"),
          },
          [go]: {
            name: "Gold",
            description: "",
            parameters: explicitProjectParameters(1, "go26"),
          },
        },
        roleTypes: {
          iter_41_contractor_1: {
            name: "r41",
            description: "",
            rates: [rateForProjects([go])],
          },
          iter_42_contractor_1: {
            name: "r42",
            description: "",
            rates: [rateForProjects([fl])],
          },
        },
      },
      timeEntries: [],
    };

    const prefilled = await extractPrefilledRatesFromGenericReport(
      report,
      expressionService,
      { additionalContractorIds: [1] },
    );

    expect(prefilled).toEqual(
      expect.arrayContaining([
        {
          roleId: "iter_41_contractor_1",
          contractorId: 1,
          rates: [rateForProjects([go])],
        },
        {
          roleId: "iter_42_contractor_1",
          contractorId: 1,
          rates: [rateForProjects([fl])],
        },
      ]),
    );
    expect(prefilled).toHaveLength(2);
  });
});
