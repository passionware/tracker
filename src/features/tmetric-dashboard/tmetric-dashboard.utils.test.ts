import type { GenericReport } from "@/services/io/_common/GenericReport";
import { describe, expect, it } from "vitest";
import {
  findReportProjectIdsByIterationAndProject,
  getContractorRatesForIterationProject,
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
