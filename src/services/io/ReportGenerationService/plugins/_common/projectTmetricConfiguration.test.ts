import { describe, expect, it, vi } from "vitest";
import { adaptTMetricToGenericFromExplicitConfig } from "../tmetric/_private/TmetricAdapter";
import type { TMetricTimeEntry } from "../tmetric/_private/TmetricSchemas";
import {
  ensureProjectTmetricConfigurationFromVariables,
  findEffectiveProjectTmetricConfigurationVariable,
  getExplicitTmetricProjectIdsForContractor,
  loadProjectTmetricConfigurationFromVariables,
  persistProjectTmetricConfigurationVariable,
  projectTmetricConfigurationVariableName,
  resolveReportProjectIdForTmetricEntry,
  scopeTmetricReportProjectId,
  tryParseProjectTmetricConfiguration,
} from "./projectTmetricConfiguration";

const minimalProject = {
  id: 112,
  name: "P",
  client: { id: 1, name: "C" },
  status: "active",
  isBillable: true,
};

function entry(overrides: Partial<TMetricTimeEntry>): TMetricTimeEntry {
  return {
    id: 1,
    isBillable: true,
    isInvoiced: false,
    startTime: "2026-01-01T10:00:00.000Z",
    endTime: "2026-01-01T11:00:00.000Z",
    tags: [],
    project: minimalProject,
    ...overrides,
  };
}

describe("adaptTMetricToGenericFromExplicitConfig", () => {
  it("maps time entry to configured report project id", () => {
    const explicitConfig = tryParseProjectTmetricConfiguration(
      JSON.stringify({
        version: 1,
        projects: [
          {
            id: "rep-gold",
            name: "Gold",
            contractors: {
              "3": {
                tmetricProjectId: "112",
                costRate: "40 EUR",
                billingRate: "80 EUR",
              },
            },
          },
        ],
      }),
    )!;
    const report = adaptTMetricToGenericFromExplicitConfig({
      entries: [entry({ id: 10, project: { ...minimalProject, id: 112 } })],
      contractorId: 3,
      defaultRoleId: "iter_1_contractor_3",
      explicitConfig,
      contractorLabel: "Tester",
      trackerProjectId: 42,
    });
    const scopedGold = scopeTmetricReportProjectId(42, "rep-gold");
    expect(report.timeEntries).toHaveLength(1);
    expect(report.timeEntries[0].projectId).toBe(scopedGold);
    expect(
      report.definitions.projectTypes[scopedGold].parameters.rateSource,
    ).toBe("explicit");
    expect(report.definitions.projectTypes[scopedGold].parameters.reportProjectId).toBe(
      "rep-gold",
    );
    expect(report.definitions.roleTypes["iter_1_contractor_3"].rates).toHaveLength(1);
    expect(
      report.definitions.roleTypes["iter_1_contractor_3"].rates[0].costRate,
    ).toBe(40);
  });
});

describe("tryParseProjectTmetricConfiguration", () => {
  it("returns null for empty projects array", () => {
    expect(
      tryParseProjectTmetricConfiguration(
        JSON.stringify({ version: 1, projects: [] }),
      ),
    ).toBeNull();
  });

  it("returns null for empty", () => {
    expect(tryParseProjectTmetricConfiguration(null)).toBeNull();
    expect(tryParseProjectTmetricConfiguration("")).toBeNull();
    expect(tryParseProjectTmetricConfiguration("{}")).toBeNull();
  });

  it("parses valid v1 JSON string", () => {
    const json = JSON.stringify({
      version: 1,
      projects: [
        {
          id: "gold",
          name: "Gold",
          contractors: {
            "1": {
              tmetricProjectId: "99",
              costRate: "10 EUR",
              billingRate: "20 EUR",
            },
          },
        },
      ],
    });
    const r = tryParseProjectTmetricConfiguration(json);
    expect(r?.version).toBe(1);
    expect(r?.projects).toHaveLength(1);
    expect(r?.projects[0].contractors["1"].tmetricProjectId).toBe("99");
  });
});

describe("getExplicitTmetricProjectIdsForContractor", () => {
  it("returns sorted unique ids", () => {
    const cfg = tryParseProjectTmetricConfiguration(
      JSON.stringify({
        version: 1,
        projects: [
          {
            id: "a",
            name: "A",
            contractors: {
              "5": {
                tmetricProjectId: "b",
                costRate: "1 EUR",
                billingRate: "2 EUR",
              },
            },
          },
          {
            id: "c",
            name: "C",
            contractors: {
              "5": {
                tmetricProjectId: "a",
                costRate: "1 EUR",
                billingRate: "2 EUR",
              },
            },
          },
        ],
      }),
    )!;
    expect(getExplicitTmetricProjectIdsForContractor(cfg, 5)).toEqual([
      "a",
      "b",
    ]);
  });
});

describe("resolveReportProjectIdForTmetricEntry", () => {
  const cfg = tryParseProjectTmetricConfiguration(
    JSON.stringify({
      version: 1,
      projects: [
        {
          id: "rep1",
          name: "R1",
          contractors: {
            "2": {
              tmetricProjectId: "112",
              costRate: "10 EUR",
              billingRate: "20 EUR",
            },
          },
        },
      ],
    }),
  )!;

  it("resolves matching id", () => {
    expect(
      resolveReportProjectIdForTmetricEntry(cfg, 2, "112", "Alice"),
    ).toBe("rep1");
  });

  it("throws when unmapped", () => {
    expect(() =>
      resolveReportProjectIdForTmetricEntry(cfg, 2, "999", "Alice"),
    ).toThrow(/no report project maps/);
  });

  it("throws when ambiguous", () => {
    const dup = tryParseProjectTmetricConfiguration(
      JSON.stringify({
        version: 1,
        projects: [
          {
            id: "x",
            name: "X",
            contractors: {
              "2": {
                tmetricProjectId: "1",
                costRate: "10 EUR",
                billingRate: "20 EUR",
              },
            },
          },
          {
            id: "y",
            name: "Y",
            contractors: {
              "2": {
                tmetricProjectId: "1",
                costRate: "10 EUR",
                billingRate: "20 EUR",
              },
            },
          },
        ],
      }),
    )!;
    expect(() =>
      resolveReportProjectIdForTmetricEntry(dup, 2, "1", "Bob"),
    ).toThrow(/more than one report project/);
  });
});

describe("projectTmetricConfigurationVariableName", () => {
  it("embeds project id in variable name", () => {
    expect(projectTmetricConfigurationVariableName(42)).toBe(
      "project_42_tmetric_configuration",
    );
  });
});

describe("loadProjectTmetricConfigurationFromVariables", () => {
  it("returns parsed config when variable matches scope", async () => {
    const json = JSON.stringify({
      version: 1,
      projects: [
        {
          id: "a",
          name: "A",
          contractors: {
            "1": {
              tmetricProjectId: "9",
              costRate: "1 EUR",
              billingRate: "2 EUR",
            },
          },
        },
      ],
    });
    const variableService = {
      ensureVariables: async () => [
        {
          id: 1,
          name: projectTmetricConfigurationVariableName(7),
          type: "const" as const,
          value: json,
          workspaceId: 10,
          clientId: 20,
          contractorId: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
    };
    const cfg = await loadProjectTmetricConfigurationFromVariables(
      variableService,
      { workspaceId: 10, clientId: 20, projectId: 7 },
    );
    expect(cfg?.projects).toHaveLength(1);
    expect(cfg?.projects[0].id).toBe("a");
  });

  it("returns parsed config when variable is global (null workspace and client)", async () => {
    const json = JSON.stringify({
      version: 1,
      projects: [
        {
          id: "g",
          name: "G",
          contractors: {
            "1": {
              tmetricProjectId: "1",
              costRate: "1 EUR",
              billingRate: "2 EUR",
            },
          },
        },
      ],
    });
    const variableService = {
      ensureVariables: async () => [
        {
          id: 1,
          name: projectTmetricConfigurationVariableName(7),
          type: "const" as const,
          value: json,
          workspaceId: null,
          clientId: null,
          contractorId: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
    };
    const cfg = await loadProjectTmetricConfigurationFromVariables(
      variableService,
      { workspaceId: 10, clientId: 20, projectId: 7 },
    );
    expect(cfg?.projects[0].id).toBe("g");
  });
});

describe("findEffectiveProjectTmetricConfigurationVariable", () => {
  const name = projectTmetricConfigurationVariableName(7);
  const rowGlobal = {
    id: 1,
    name,
    type: "const" as const,
    value: "{}",
    workspaceId: null,
    clientId: null,
    contractorId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  const rowScoped = {
    id: 2,
    name,
    type: "const" as const,
    value: JSON.stringify({
      version: 1,
      projects: [
        {
          id: "scoped",
          name: "S",
          contractors: {
            "1": {
              tmetricProjectId: "9",
              costRate: "1 EUR",
              billingRate: "2 EUR",
            },
          },
        },
      ],
    }),
    workspaceId: 10,
    clientId: 20,
    contractorId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  it("prefers workspace+client row over global", () => {
    const picked = findEffectiveProjectTmetricConfigurationVariable(
      [rowGlobal, rowScoped],
      { workspaceId: 10, clientId: 20, projectId: 7 },
    );
    expect(picked?.id).toBe(2);
  });

  it("uses global when no more specific row exists", () => {
    const picked = findEffectiveProjectTmetricConfigurationVariable(
      [rowGlobal],
      { workspaceId: 10, clientId: 20, projectId: 7 },
    );
    expect(picked?.id).toBe(1);
  });
});

describe("ensureProjectTmetricConfigurationFromVariables", () => {
  const validJson = JSON.stringify({
    version: 1,
    projects: [
      {
        id: "a",
        name: "A",
        contractors: {
          "1": {
            tmetricProjectId: "9",
            costRate: "1 EUR",
            billingRate: "2 EUR",
          },
        },
      },
    ],
  });

  it("returns config when variable is valid", async () => {
    const variableService = {
      ensureVariables: async () => [
        {
          id: 1,
          name: projectTmetricConfigurationVariableName(7),
          type: "const" as const,
          value: validJson,
          workspaceId: 10,
          clientId: 20,
          contractorId: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
    };
    const cfg = await ensureProjectTmetricConfigurationFromVariables(
      variableService,
      { workspaceId: 10, clientId: 20, projectId: 7 },
    );
    expect(cfg.projects).toHaveLength(1);
  });

  it("throws when variable is missing", async () => {
    const variableService = {
      ensureVariables: async () => [],
    };
    await expect(
      ensureProjectTmetricConfigurationFromVariables(variableService, {
        workspaceId: 10,
        clientId: 20,
        projectId: 7,
      }),
    ).rejects.toThrow(/TMetric mapping is required/);
  });

  it("throws when contractor has no TMetric project ids", async () => {
    const json = JSON.stringify({
      version: 1,
      projects: [
        {
          id: "a",
          name: "A",
          contractors: {
            "99": {
              tmetricProjectId: "9",
              costRate: "1 EUR",
              billingRate: "2 EUR",
            },
          },
        },
      ],
    });
    const variableService = {
      ensureVariables: async () => [
        {
          id: 1,
          name: projectTmetricConfigurationVariableName(7),
          type: "const" as const,
          value: json,
          workspaceId: 10,
          clientId: 20,
          contractorId: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
    };
    await expect(
      ensureProjectTmetricConfigurationFromVariables(
        variableService,
        { workspaceId: 10, clientId: 20, projectId: 7 },
        { contractorId: 1, contractorLabel: "Bob" },
      ),
    ).rejects.toThrow(/no TMetric project ids configured for Bob/);
  });
});

describe("persistProjectTmetricConfigurationVariable", () => {
  const minimalValid = tryParseProjectTmetricConfiguration(
    JSON.stringify({
      version: 1,
      projects: [
        {
          id: "a",
          name: "A",
          contractors: {
            "1": {
              tmetricProjectId: "9",
              costRate: "1 EUR",
              billingRate: "2 EUR",
            },
          },
        },
      ],
    }),
  )!;

  it("updates the resolved row by id and preserves its scope", async () => {
    const updateVariable = vi.fn();
    const createVariable = vi.fn();
    const variableService = {
      ensureVariables: vi.fn().mockResolvedValue([
        {
          id: 99,
          name: projectTmetricConfigurationVariableName(7),
          type: "const" as const,
          value: JSON.stringify(minimalValid),
          workspaceId: null,
          clientId: null,
          contractorId: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]),
      updateVariable,
      createVariable,
    };
    const next = structuredClone(minimalValid);
    next.projects[0].name = "Renamed";
    await persistProjectTmetricConfigurationVariable(
      variableService,
      { workspaceId: 10, clientId: 20, projectId: 7 },
      next,
    );
    expect(updateVariable).toHaveBeenCalledOnce();
    expect(updateVariable).toHaveBeenCalledWith(
      99,
      expect.objectContaining({
        workspaceId: null,
        clientId: null,
        contractorId: null,
      }),
    );
    expect(createVariable).not.toHaveBeenCalled();
  });

  it("creates a scoped row when none exists", async () => {
    const updateVariable = vi.fn();
    const createVariable = vi.fn();
    const variableService = {
      ensureVariables: vi.fn().mockResolvedValue([]),
      updateVariable,
      createVariable,
    };
    await persistProjectTmetricConfigurationVariable(
      variableService,
      { workspaceId: 10, clientId: 20, projectId: 7 },
      minimalValid,
    );
    expect(createVariable).toHaveBeenCalledOnce();
    expect(createVariable).toHaveBeenCalledWith(
      expect.objectContaining({
        workspaceId: 10,
        clientId: 20,
        contractorId: null,
      }),
    );
    expect(updateVariable).not.toHaveBeenCalled();
  });
});
