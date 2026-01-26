import { GeneratedReportSource } from "@/api/generated-report-source/generated-report-source.api.ts";
import { ProjectIteration } from "@/api/project-iteration/project-iteration.api.ts";
import { Project } from "@/api/project/project.api.ts";
import { GenericReport, RoleRate } from "@/services/io/_common/GenericReport";
import { CalendarDate } from "@internationalized/date";
import { describe, expect, it, vi } from "vitest";
import { convertGeneratedReportToFacts } from "./convertGeneratedReportToFacts";
import {
  BillingFact,
  CostFact,
  ReportFact,
} from "./ReconciliationService.types";

// Add snapshot serializer for CalendarDate
expect.addSnapshotSerializer({
  test: (val) => val instanceof CalendarDate,
  print: (val: unknown) => `[Date:${(val as CalendarDate).toString()}]`,
});

describe("convertGeneratedReportToFacts", () => {
  /**
   * Creates a counter-based UUID factory for deterministic testing
   */
  function createCounterBasedUuidFactory(): () => string {
    let counter = 1;
    return () => `uuid-${counter++}`;
  }

  const createMockProjectIteration = (
    overrides?: Partial<ProjectIteration>,
  ): ProjectIteration => ({
    id: 1,
    createdAt: new Date(),
    projectId: 1,
    periodStart: new CalendarDate(2024, 1, 1),
    periodEnd: new CalendarDate(2024, 1, 31),
    status: "active",
    description: null,
    ordinalNumber: 1,
    currency: "EUR",
    ...overrides,
  });

  const createMockProject = (overrides?: Partial<Project>): Project => ({
    id: 1,
    createdAt: new Date(),
    name: "Test Project",
    status: "active",
    description: null,
    workspaceIds: [1, 2],
    clientId: 10,
    ...overrides,
  });

  const createMockRoleRate = (overrides?: Partial<RoleRate>): RoleRate => ({
    billing: "hourly",
    activityTypes: [],
    taskTypes: [],
    projectIds: [],
    costRate: 50,
    costCurrency: "EUR",
    billingRate: 75,
    billingCurrency: "EUR",
    ...overrides,
  });

  const createMockGeneratedReport = (
    timeEntries: GenericReport["timeEntries"],
    rates: RoleRate[] = [createMockRoleRate()],
  ): GeneratedReportSource => ({
    id: 100,
    createdAt: new Date(),
    projectIterationId: 1,
    data: {
      definitions: {
        taskTypes: {},
        activityTypes: {},
        projectTypes: {},
        roleTypes: {
          role1: {
            name: "Developer",
            description: "Software developer",
            rates,
          },
        },
      },
      timeEntries,
    },
    originalData: {},
  });

  it("should create report, cost, and link facts for real contractors with real rates", () => {
    // Test contractors with anonymized names and adjusted rates:
    // 1: Contractor A - Cost: 40.00 EUR, Billing: 40.00 EUR
    // 2: Contractor B - Cost: 50.00 EUR, Billing: 50.00 EUR
    // 4: Contractor C - Cost: 150.00 PLN, Billing: 40.00 EUR
    // 5: Contractor D - Cost: 120.00 PLN, Billing: 30.00 EUR

    const timeEntries = [
      {
        id: "entry1",
        contractorId: 1, // Contractor A
        roleId: "role1",
        activityId: "activity1",
        taskId: "task1",
        projectId: "project1",
        startAt: new Date("2024-01-01T09:00:00Z"),
        endAt: new Date("2024-01-01T17:00:00Z"), // 8 hours
        createdAt: new Date(),
        updatedAt: new Date(),
        note: null,
      },
      {
        id: "entry2",
        contractorId: 2, // Contractor B
        roleId: "role2",
        activityId: "activity1",
        taskId: "task1",
        projectId: "project1",
        startAt: new Date("2024-01-02T09:00:00Z"),
        endAt: new Date("2024-01-02T17:00:00Z"), // 8 hours
        createdAt: new Date(),
        updatedAt: new Date(),
        note: null,
      },
      {
        id: "entry3",
        contractorId: 4, // Contractor C
        roleId: "role3",
        activityId: "activity1",
        taskId: "task1",
        projectId: "project1",
        startAt: new Date("2024-01-03T09:00:00Z"),
        endAt: new Date("2024-01-03T17:00:00Z"), // 8 hours
        createdAt: new Date(),
        updatedAt: new Date(),
        note: null,
      },
      {
        id: "entry4",
        contractorId: 5, // Contractor D
        roleId: "role4",
        activityId: "activity1",
        taskId: "task1",
        projectId: "project1",
        startAt: new Date("2024-01-04T09:00:00Z"),
        endAt: new Date("2024-01-04T17:00:00Z"), // 8 hours
        createdAt: new Date(),
        updatedAt: new Date(),
        note: null,
      },
    ];

    const generatedReport: GeneratedReportSource = {
      id: 100,
      createdAt: new Date(),
      projectIterationId: 1,
      data: {
        definitions: {
          taskTypes: {},
          activityTypes: {},
          projectTypes: {},
          roleTypes: {
            role1: {
              name: "Developer",
              description: "Contractor A rate",
              rates: [
                createMockRoleRate({
                  costRate: 40,
                  costCurrency: "EUR",
                  billingRate: 40,
                  billingCurrency: "EUR",
                }),
              ],
            },
            role2: {
              name: "Developer",
              description: "Contractor B rate",
              rates: [
                createMockRoleRate({
                  costRate: 50,
                  costCurrency: "EUR",
                  billingRate: 50,
                  billingCurrency: "EUR",
                }),
              ],
            },
            role3: {
              name: "Developer",
              description: "Contractor C rate",
              rates: [
                createMockRoleRate({
                  costRate: 150,
                  costCurrency: "PLN",
                  billingRate: 40,
                  billingCurrency: "EUR",
                }),
              ],
            },
            role4: {
              name: "Developer",
              description: "Contractor D rate",
              rates: [
                createMockRoleRate({
                  costRate: 120,
                  costCurrency: "PLN",
                  billingRate: 30,
                  billingCurrency: "EUR",
                }),
              ],
            },
          },
        },
        timeEntries,
      },
      originalData: {},
    };

    const projectIteration = createMockProjectIteration();
    const project = createMockProject({ name: "Atellio - development" });
    const contractorWorkspaceMap = new Map([
      [1, 1], // Contractor A -> workspace 1
      [2, 1], // Contractor B -> workspace 1
      [4, 1], // Contractor C -> workspace 1
      [5, 1], // Contractor D -> workspace 1
    ]);
    const contractorNameMap = new Map([
      [1, "Contractor A"],
      [2, "Contractor B"],
      [4, "Contractor C"],
      [5, "Contractor D"],
    ]);
    const uuidFactory = createCounterBasedUuidFactory();

    const facts = convertGeneratedReportToFacts(
      generatedReport,
      projectIteration,
      project,
      contractorWorkspaceMap,
      contractorNameMap,
      uuidFactory,
    );

    expect(facts).toMatchInlineSnapshot(`
      [
        {
          "billingAmount": 320,
          "billingCurrency": "EUR",
          "billingUnitPrice": 40,
          "payload": {
            "clientId": 10,
            "contractorId": 1,
            "currency": "EUR",
            "description": "Project: Atellio - development
      Period: 2024-01-01 to 2024-01-31
      Hours: 8.00h
      Internal Rate: 40.00 EUR/h
      External Rate: 40.00 EUR/h

      Report Value (Internal): 320.00 EUR
      Billing Value (External): 320.00 EUR",
            "netValue": 320,
            "periodEnd": [Date:2024-01-31],
            "periodStart": [Date:2024-01-01],
            "projectIterationId": 1,
            "quantity": 8,
            "unit": "h",
            "unitPrice": 40,
            "workspaceId": 1,
          },
          "type": "report",
          "uuid": "uuid-1",
        },
        {
          "constraints": {
            "linkedToReport": "uuid-1",
          },
          "payload": {
            "contractorId": 1,
            "counterparty": null,
            "currency": "EUR",
            "description": "Project: Atellio - development
      Contractor: Contractor A
      Hours: 8.00h
      Internal Rate: 40.00 EUR/h
      Cost Value: 320.00 EUR",
            "grossValue": 320,
            "invoiceDate": [Date:2024-01-01],
            "invoiceNumber": "COST-2024-01-1",
            "netValue": 320,
            "workspaceId": 1,
          },
          "type": "cost",
          "uuid": "uuid-2",
        },
        {
          "payload": {
            "breakdown": {
              "costCurrency": "EUR",
              "costUnitPrice": 40,
              "exchangeRate": 1,
              "quantity": 8,
              "reportCurrency": "EUR",
              "reportUnitPrice": 40,
              "unit": "h",
            },
            "costAmount": 320,
            "costId": null,
            "description": "Link between cost and report for contractor 1",
            "reportAmount": 320,
            "reportId": null,
          },
          "type": "linkCostReport",
          "uuid": "uuid-3",
        },
        {
          "billingAmount": 400,
          "billingCurrency": "EUR",
          "billingUnitPrice": 50,
          "payload": {
            "clientId": 10,
            "contractorId": 2,
            "currency": "EUR",
            "description": "Project: Atellio - development
      Period: 2024-01-01 to 2024-01-31
      Hours: 8.00h
      Internal Rate: 50.00 EUR/h
      External Rate: 50.00 EUR/h

      Report Value (Internal): 400.00 EUR
      Billing Value (External): 400.00 EUR",
            "netValue": 400,
            "periodEnd": [Date:2024-01-31],
            "periodStart": [Date:2024-01-01],
            "projectIterationId": 1,
            "quantity": 8,
            "unit": "h",
            "unitPrice": 50,
            "workspaceId": 1,
          },
          "type": "report",
          "uuid": "uuid-4",
        },
        {
          "constraints": {
            "linkedToReport": "uuid-4",
          },
          "payload": {
            "contractorId": 2,
            "counterparty": null,
            "currency": "EUR",
            "description": "Project: Atellio - development
      Contractor: Contractor B
      Hours: 8.00h
      Internal Rate: 50.00 EUR/h
      Cost Value: 400.00 EUR",
            "grossValue": 400,
            "invoiceDate": [Date:2024-01-01],
            "invoiceNumber": "COST-2024-01-2",
            "netValue": 400,
            "workspaceId": 1,
          },
          "type": "cost",
          "uuid": "uuid-5",
        },
        {
          "payload": {
            "breakdown": {
              "costCurrency": "EUR",
              "costUnitPrice": 50,
              "exchangeRate": 1,
              "quantity": 8,
              "reportCurrency": "EUR",
              "reportUnitPrice": 50,
              "unit": "h",
            },
            "costAmount": 400,
            "costId": null,
            "description": "Link between cost and report for contractor 2",
            "reportAmount": 400,
            "reportId": null,
          },
          "type": "linkCostReport",
          "uuid": "uuid-6",
        },
        {
          "billingAmount": 320,
          "billingCurrency": "EUR",
          "billingUnitPrice": 40,
          "payload": {
            "clientId": 10,
            "contractorId": 4,
            "currency": "PLN",
            "description": "Project: Atellio - development
      Period: 2024-01-01 to 2024-01-31
      Hours: 8.00h
      Internal Rate: 150.00 PLN/h
      External Rate: 40.00 EUR/h

      Report Value (Internal): 1200.00 PLN
      Billing Value (External): 320.00 EUR",
            "netValue": 1200,
            "periodEnd": [Date:2024-01-31],
            "periodStart": [Date:2024-01-01],
            "projectIterationId": 1,
            "quantity": 8,
            "unit": "h",
            "unitPrice": 150,
            "workspaceId": 1,
          },
          "type": "report",
          "uuid": "uuid-7",
        },
        {
          "constraints": {
            "linkedToReport": "uuid-7",
          },
          "payload": {
            "contractorId": 4,
            "counterparty": null,
            "currency": "PLN",
            "description": "Project: Atellio - development
      Contractor: Contractor C
      Hours: 8.00h
      Internal Rate: 150.00 PLN/h
      Cost Value: 1200.00 PLN",
            "grossValue": 1200,
            "invoiceDate": [Date:2024-01-01],
            "invoiceNumber": "COST-2024-01-4",
            "netValue": 1200,
            "workspaceId": 1,
          },
          "type": "cost",
          "uuid": "uuid-8",
        },
        {
          "payload": {
            "breakdown": {
              "costCurrency": "PLN",
              "costUnitPrice": 150,
              "exchangeRate": 1,
              "quantity": 8,
              "reportCurrency": "PLN",
              "reportUnitPrice": 150,
              "unit": "h",
            },
            "costAmount": 1200,
            "costId": null,
            "description": "Link between cost and report for contractor 4",
            "reportAmount": 1200,
            "reportId": null,
          },
          "type": "linkCostReport",
          "uuid": "uuid-9",
        },
        {
          "billingAmount": 240,
          "billingCurrency": "EUR",
          "billingUnitPrice": 30,
          "payload": {
            "clientId": 10,
            "contractorId": 5,
            "currency": "PLN",
            "description": "Project: Atellio - development
      Period: 2024-01-01 to 2024-01-31
      Hours: 8.00h
      Internal Rate: 120.00 PLN/h
      External Rate: 30.00 EUR/h

      Report Value (Internal): 960.00 PLN
      Billing Value (External): 240.00 EUR",
            "netValue": 960,
            "periodEnd": [Date:2024-01-31],
            "periodStart": [Date:2024-01-01],
            "projectIterationId": 1,
            "quantity": 8,
            "unit": "h",
            "unitPrice": 120,
            "workspaceId": 1,
          },
          "type": "report",
          "uuid": "uuid-10",
        },
        {
          "constraints": {
            "linkedToReport": "uuid-10",
          },
          "payload": {
            "contractorId": 5,
            "counterparty": null,
            "currency": "PLN",
            "description": "Project: Atellio - development
      Contractor: Contractor D
      Hours: 8.00h
      Internal Rate: 120.00 PLN/h
      Cost Value: 960.00 PLN",
            "grossValue": 960,
            "invoiceDate": [Date:2024-01-01],
            "invoiceNumber": "COST-2024-01-5",
            "netValue": 960,
            "workspaceId": 1,
          },
          "type": "cost",
          "uuid": "uuid-11",
        },
        {
          "payload": {
            "breakdown": {
              "costCurrency": "PLN",
              "costUnitPrice": 120,
              "exchangeRate": 1,
              "quantity": 8,
              "reportCurrency": "PLN",
              "reportUnitPrice": 120,
              "unit": "h",
            },
            "costAmount": 960,
            "costId": null,
            "description": "Link between cost and report for contractor 5",
            "reportAmount": 960,
            "reportId": null,
          },
          "type": "linkCostReport",
          "uuid": "uuid-12",
        },
        {
          "constraints": {
            "linkedToReport": "uuid-1",
          },
          "payload": {
            "clientId": 10,
            "currency": "EUR",
            "description": "Project: Atellio - development

      Linked Reports:
        1. Contractor A
           Hours: 8.00h
           Rate: 40.00 EUR/h
           Amount: 320.00 EUR
        2. Contractor B
           Hours: 8.00h
           Rate: 50.00 EUR/h
           Amount: 400.00 EUR
        3. Contractor C
           Hours: 8.00h
           Rate: 40.00 EUR/h
           Amount: 320.00 EUR
        4. Contractor D
           Hours: 8.00h
           Rate: 30.00 EUR/h
           Amount: 240.00 EUR

      Total: 1280.00 EUR",
            "invoiceDate": [Date:2024-01-01],
            "invoiceNumber": "INV-2024-01-WS1",
            "totalGross": 1280,
            "totalNet": 1280,
            "workspaceId": 1,
          },
          "type": "billing",
          "uuid": "uuid-13",
        },
        {
          "payload": {
            "billingAmount": 320,
            "billingId": 0,
            "breakdown": {
              "billingCurrency": "EUR",
              "billingUnitPrice": 40,
              "quantity": 8,
              "reportCurrency": "EUR",
              "reportUnitPrice": 40,
              "unit": "h",
            },
            "description": "Link between billing and report for contractor 1",
            "linkType": "reconcile",
            "reportAmount": 320,
            "reportId": 0,
          },
          "type": "linkBillingReport",
          "uuid": "uuid-14",
        },
        {
          "payload": {
            "billingAmount": 400,
            "billingId": 0,
            "breakdown": {
              "billingCurrency": "EUR",
              "billingUnitPrice": 50,
              "quantity": 8,
              "reportCurrency": "EUR",
              "reportUnitPrice": 50,
              "unit": "h",
            },
            "description": "Link between billing and report for contractor 2",
            "linkType": "reconcile",
            "reportAmount": 400,
            "reportId": 0,
          },
          "type": "linkBillingReport",
          "uuid": "uuid-15",
        },
        {
          "payload": {
            "billingAmount": 320,
            "billingId": 0,
            "breakdown": {
              "billingCurrency": "EUR",
              "billingUnitPrice": 40,
              "quantity": 8,
              "reportCurrency": "PLN",
              "reportUnitPrice": 150,
              "unit": "h",
            },
            "description": "Link between billing and report for contractor 4",
            "linkType": "reconcile",
            "reportAmount": 1200,
            "reportId": 0,
          },
          "type": "linkBillingReport",
          "uuid": "uuid-16",
        },
        {
          "payload": {
            "billingAmount": 240,
            "billingId": 0,
            "breakdown": {
              "billingCurrency": "EUR",
              "billingUnitPrice": 30,
              "quantity": 8,
              "reportCurrency": "PLN",
              "reportUnitPrice": 120,
              "unit": "h",
            },
            "description": "Link between billing and report for contractor 5",
            "linkType": "reconcile",
            "reportAmount": 960,
            "reportId": 0,
          },
          "type": "linkBillingReport",
          "uuid": "uuid-17",
        },
      ]
    `);
  });

  it("should group multiple time entries by contractor and rate", () => {
    const timeEntries = [
      {
        id: "entry1",
        contractorId: 1,
        roleId: "role1",
        activityId: "activity1",
        taskId: "task1",
        projectId: "project1",
        startAt: new Date("2024-01-01T09:00:00Z"),
        endAt: new Date("2024-01-01T13:00:00Z"), // 4 hours
        createdAt: new Date(),
        updatedAt: new Date(),
        note: null,
      },
      {
        id: "entry2",
        contractorId: 1,
        roleId: "role1",
        activityId: "activity1",
        taskId: "task1",
        projectId: "project1",
        startAt: new Date("2024-01-01T14:00:00Z"),
        endAt: new Date("2024-01-01T18:00:00Z"), // 4 hours
        createdAt: new Date(),
        updatedAt: new Date(),
        note: null,
      },
    ];

    const generatedReport = createMockGeneratedReport(timeEntries);
    const projectIteration = createMockProjectIteration();
    const project = createMockProject();
    const contractorWorkspaceMap = new Map([[1, 1]]);
    const uuidFactory = createCounterBasedUuidFactory();

    const facts = convertGeneratedReportToFacts(
      generatedReport,
      projectIteration,
      project,
      contractorWorkspaceMap,
      new Map(),
      uuidFactory,
    );

    const reportFact = facts.find((f) => f.type === "report") as ReportFact;
    expect([reportFact]).toMatchInlineSnapshot(`
      [
        {
          "billingAmount": 600,
          "billingCurrency": "EUR",
          "billingUnitPrice": 75,
          "payload": {
            "clientId": 10,
            "contractorId": 1,
            "currency": "EUR",
            "description": "Project: Test Project
      Period: 2024-01-01 to 2024-01-31
      Hours: 8.00h
      Internal Rate: 50.00 EUR/h
      External Rate: 75.00 EUR/h

      Report Value (Internal): 400.00 EUR
      Billing Value (External): 600.00 EUR",
            "netValue": 400,
            "periodEnd": [Date:2024-01-31],
            "periodStart": [Date:2024-01-01],
            "projectIterationId": 1,
            "quantity": 8,
            "unit": "h",
            "unitPrice": 50,
            "workspaceId": 1,
          },
          "type": "report",
          "uuid": "uuid-1",
        },
      ]
    `);
  });

  it("should create separate report facts for different contractors", () => {
    const rates = [createMockRoleRate({ costRate: 50, billingRate: 75 })];

    const timeEntries = [
      {
        id: "entry1",
        contractorId: 1,
        roleId: "role1",
        activityId: "activity1",
        taskId: "task1",
        projectId: "project1",
        startAt: new Date("2024-01-01T09:00:00Z"),
        endAt: new Date("2024-01-01T17:00:00Z"), // 8 hours
        createdAt: new Date(),
        updatedAt: new Date(),
        note: null,
      },
      {
        id: "entry2",
        contractorId: 2,
        roleId: "role1",
        activityId: "activity1",
        taskId: "task1",
        projectId: "project1",
        startAt: new Date("2024-01-01T09:00:00Z"),
        endAt: new Date("2024-01-01T17:00:00Z"), // 8 hours
        createdAt: new Date(),
        updatedAt: new Date(),
        note: null,
      },
    ];

    const generatedReport = createMockGeneratedReport(timeEntries, rates);
    const projectIteration = createMockProjectIteration();
    const project = createMockProject();
    const contractorWorkspaceMap = new Map([
      [1, 1],
      [2, 1],
    ]);
    const uuidFactory = createCounterBasedUuidFactory();

    const facts = convertGeneratedReportToFacts(
      generatedReport,
      projectIteration,
      project,
      contractorWorkspaceMap,
      new Map(),
      uuidFactory,
    );

    const reportFacts = facts.filter(
      (f) => f.type === "report",
    ) as ReportFact[];
    expect(reportFacts).toMatchInlineSnapshot(`
      [
        {
          "billingAmount": 600,
          "billingCurrency": "EUR",
          "billingUnitPrice": 75,
          "payload": {
            "clientId": 10,
            "contractorId": 1,
            "currency": "EUR",
            "description": "Project: Test Project
      Period: 2024-01-01 to 2024-01-31
      Hours: 8.00h
      Internal Rate: 50.00 EUR/h
      External Rate: 75.00 EUR/h

      Report Value (Internal): 400.00 EUR
      Billing Value (External): 600.00 EUR",
            "netValue": 400,
            "periodEnd": [Date:2024-01-31],
            "periodStart": [Date:2024-01-01],
            "projectIterationId": 1,
            "quantity": 8,
            "unit": "h",
            "unitPrice": 50,
            "workspaceId": 1,
          },
          "type": "report",
          "uuid": "uuid-1",
        },
        {
          "billingAmount": 600,
          "billingCurrency": "EUR",
          "billingUnitPrice": 75,
          "payload": {
            "clientId": 10,
            "contractorId": 2,
            "currency": "EUR",
            "description": "Project: Test Project
      Period: 2024-01-01 to 2024-01-31
      Hours: 8.00h
      Internal Rate: 50.00 EUR/h
      External Rate: 75.00 EUR/h

      Report Value (Internal): 400.00 EUR
      Billing Value (External): 600.00 EUR",
            "netValue": 400,
            "periodEnd": [Date:2024-01-31],
            "periodStart": [Date:2024-01-01],
            "projectIterationId": 1,
            "quantity": 8,
            "unit": "h",
            "unitPrice": 50,
            "workspaceId": 1,
          },
          "type": "report",
          "uuid": "uuid-4",
        },
      ]
    `);
  });

  it("should create separate report facts for different rates", () => {
    const rates = [
      createMockRoleRate({
        costRate: 50,
        billingRate: 75,
        activityTypes: ["activity1"],
      }),
      createMockRoleRate({
        costRate: 60,
        billingRate: 90,
        activityTypes: ["activity2"],
      }),
    ];

    const timeEntries = [
      {
        id: "entry1",
        contractorId: 1,
        roleId: "role1",
        activityId: "activity1",
        taskId: "task1",
        projectId: "project1",
        startAt: new Date("2024-01-01T09:00:00Z"),
        endAt: new Date("2024-01-01T17:00:00Z"), // 8 hours
        createdAt: new Date(),
        updatedAt: new Date(),
        note: null,
      },
      {
        id: "entry2",
        contractorId: 1,
        roleId: "role1",
        activityId: "activity2",
        taskId: "task1",
        projectId: "project1",
        startAt: new Date("2024-01-02T09:00:00Z"),
        endAt: new Date("2024-01-02T17:00:00Z"), // 8 hours
        createdAt: new Date(),
        updatedAt: new Date(),
        note: null,
      },
    ];

    const generatedReport = createMockGeneratedReport(timeEntries, rates);
    const projectIteration = createMockProjectIteration();
    const project = createMockProject();
    const contractorWorkspaceMap = new Map([[1, 1]]);
    const uuidFactory = createCounterBasedUuidFactory();

    const facts = convertGeneratedReportToFacts(
      generatedReport,
      projectIteration,
      project,
      contractorWorkspaceMap,
      new Map(),
      uuidFactory,
    );

    const reportFacts = facts.filter(
      (f) => f.type === "report",
    ) as ReportFact[];
    expect(reportFacts).toMatchInlineSnapshot(`
      [
        {
          "billingAmount": 600,
          "billingCurrency": "EUR",
          "billingUnitPrice": 75,
          "payload": {
            "clientId": 10,
            "contractorId": 1,
            "currency": "EUR",
            "description": "Project: Test Project
      Period: 2024-01-01 to 2024-01-31
      Hours: 8.00h
      Internal Rate: 50.00 EUR/h
      External Rate: 75.00 EUR/h

      Report Value (Internal): 400.00 EUR
      Billing Value (External): 600.00 EUR",
            "netValue": 400,
            "periodEnd": [Date:2024-01-31],
            "periodStart": [Date:2024-01-01],
            "projectIterationId": 1,
            "quantity": 8,
            "unit": "h",
            "unitPrice": 50,
            "workspaceId": 1,
          },
          "type": "report",
          "uuid": "uuid-1",
        },
        {
          "billingAmount": 720,
          "billingCurrency": "EUR",
          "billingUnitPrice": 90,
          "payload": {
            "clientId": 10,
            "contractorId": 1,
            "currency": "EUR",
            "description": "Project: Test Project
      Period: 2024-01-01 to 2024-01-31
      Hours: 8.00h
      Internal Rate: 60.00 EUR/h
      External Rate: 90.00 EUR/h

      Report Value (Internal): 480.00 EUR
      Billing Value (External): 720.00 EUR",
            "netValue": 480,
            "periodEnd": [Date:2024-01-31],
            "periodStart": [Date:2024-01-01],
            "projectIterationId": 1,
            "quantity": 8,
            "unit": "h",
            "unitPrice": 60,
            "workspaceId": 1,
          },
          "type": "report",
          "uuid": "uuid-4",
        },
      ]
    `);
  });

  it("should group billing facts by workspace and currency", () => {
    const timeEntries = [
      {
        id: "entry1",
        contractorId: 1,
        roleId: "role1",
        activityId: "activity1",
        taskId: "task1",
        projectId: "project1",
        startAt: new Date("2024-01-01T09:00:00Z"),
        endAt: new Date("2024-01-01T17:00:00Z"), // 8 hours
        createdAt: new Date(),
        updatedAt: new Date(),
        note: null,
      },
      {
        id: "entry2",
        contractorId: 2,
        roleId: "role1",
        activityId: "activity1",
        taskId: "task1",
        projectId: "project1",
        startAt: new Date("2024-01-01T09:00:00Z"),
        endAt: new Date("2024-01-01T17:00:00Z"), // 8 hours
        createdAt: new Date(),
        updatedAt: new Date(),
        note: null,
      },
    ];

    const generatedReport = createMockGeneratedReport(timeEntries);
    const projectIteration = createMockProjectIteration();
    const project = createMockProject();
    const contractorWorkspaceMap = new Map([
      [1, 1],
      [2, 1],
    ]);
    const uuidFactory = createCounterBasedUuidFactory();

    const facts = convertGeneratedReportToFacts(
      generatedReport,
      projectIteration,
      project,
      contractorWorkspaceMap,
      new Map(),
      uuidFactory,
    );

    const billingFacts = facts.filter(
      (f) => f.type === "billing",
    ) as BillingFact[];
    expect(billingFacts).toMatchInlineSnapshot(`
      [
        {
          "constraints": {
            "linkedToReport": "uuid-1",
          },
          "payload": {
            "clientId": 10,
            "currency": "EUR",
            "description": "Project: Test Project

      Linked Reports:
        1. Contractor #1
           Hours: 8.00h
           Rate: 75.00 EUR/h
           Amount: 600.00 EUR
        2. Contractor #2
           Hours: 8.00h
           Rate: 75.00 EUR/h
           Amount: 600.00 EUR

      Total: 1200.00 EUR",
            "invoiceDate": [Date:2024-01-01],
            "invoiceNumber": "INV-2024-01-WS1",
            "totalGross": 1200,
            "totalNet": 1200,
            "workspaceId": 1,
          },
          "type": "billing",
          "uuid": "uuid-7",
        },
      ]
    `);
  });

  it("should create separate billing facts for different workspaces", () => {
    const timeEntries = [
      {
        id: "entry1",
        contractorId: 1,
        roleId: "role1",
        activityId: "activity1",
        taskId: "task1",
        projectId: "project1",
        startAt: new Date("2024-01-01T09:00:00Z"),
        endAt: new Date("2024-01-01T17:00:00Z"), // 8 hours
        createdAt: new Date(),
        updatedAt: new Date(),
        note: null,
      },
      {
        id: "entry2",
        contractorId: 2,
        roleId: "role1",
        activityId: "activity1",
        taskId: "task1",
        projectId: "project1",
        startAt: new Date("2024-01-01T09:00:00Z"),
        endAt: new Date("2024-01-01T17:00:00Z"), // 8 hours
        createdAt: new Date(),
        updatedAt: new Date(),
        note: null,
      },
    ];

    const generatedReport = createMockGeneratedReport(timeEntries);
    const projectIteration = createMockProjectIteration();
    const project = createMockProject();
    const contractorWorkspaceMap = new Map([
      [1, 1],
      [2, 2],
    ]);
    const uuidFactory = createCounterBasedUuidFactory();

    const facts = convertGeneratedReportToFacts(
      generatedReport,
      projectIteration,
      project,
      contractorWorkspaceMap,
      new Map(),
      uuidFactory,
    );

    const billingFacts = facts.filter(
      (f) => f.type === "billing",
    ) as BillingFact[];
    expect(billingFacts).toMatchInlineSnapshot(`
      [
        {
          "constraints": {
            "linkedToReport": "uuid-1",
          },
          "payload": {
            "clientId": 10,
            "currency": "EUR",
            "description": "Project: Test Project

      Linked Reports:
        1. Contractor #1
           Hours: 8.00h
           Rate: 75.00 EUR/h
           Amount: 600.00 EUR

      Total: 600.00 EUR",
            "invoiceDate": [Date:2024-01-01],
            "invoiceNumber": "INV-2024-01-WS1",
            "totalGross": 600,
            "totalNet": 600,
            "workspaceId": 1,
          },
          "type": "billing",
          "uuid": "uuid-7",
        },
        {
          "constraints": {
            "linkedToReport": "uuid-4",
          },
          "payload": {
            "clientId": 10,
            "currency": "EUR",
            "description": "Project: Test Project

      Linked Reports:
        1. Contractor #2
           Hours: 8.00h
           Rate: 75.00 EUR/h
           Amount: 600.00 EUR

      Total: 600.00 EUR",
            "invoiceDate": [Date:2024-01-01],
            "invoiceNumber": "INV-2024-01-WS2",
            "totalGross": 600,
            "totalNet": 600,
            "workspaceId": 2,
          },
          "type": "billing",
          "uuid": "uuid-9",
        },
      ]
    `);
  });

  it("should create separate billing facts for different currencies", () => {
    const rates = [
      createMockRoleRate({
        costRate: 50,
        billingRate: 75,
        costCurrency: "EUR",
        billingCurrency: "EUR",
        activityTypes: ["activity1"],
      }),
      createMockRoleRate({
        costRate: 60,
        billingRate: 100,
        costCurrency: "USD",
        billingCurrency: "USD",
        activityTypes: ["activity2"],
      }),
    ];

    const timeEntries = [
      {
        id: "entry1",
        contractorId: 1,
        roleId: "role1",
        activityId: "activity1",
        taskId: "task1",
        projectId: "project1",
        startAt: new Date("2024-01-01T09:00:00Z"),
        endAt: new Date("2024-01-01T17:00:00Z"), // 8 hours
        createdAt: new Date(),
        updatedAt: new Date(),
        note: null,
      },
      {
        id: "entry2",
        contractorId: 1,
        roleId: "role1",
        activityId: "activity2",
        taskId: "task1",
        projectId: "project1",
        startAt: new Date("2024-01-02T09:00:00Z"),
        endAt: new Date("2024-01-02T17:00:00Z"), // 8 hours
        createdAt: new Date(),
        updatedAt: new Date(),
        note: null,
      },
    ];

    const generatedReport = createMockGeneratedReport(timeEntries, rates);
    const projectIteration = createMockProjectIteration();
    const project = createMockProject();
    const contractorWorkspaceMap = new Map([[1, 1]]);
    const uuidFactory = createCounterBasedUuidFactory();

    const facts = convertGeneratedReportToFacts(
      generatedReport,
      projectIteration,
      project,
      contractorWorkspaceMap,
      new Map(),
      uuidFactory,
    );

    const billingFacts = facts.filter(
      (f) => f.type === "billing",
    ) as BillingFact[];
    expect(billingFacts).toMatchInlineSnapshot(`
      [
        {
          "constraints": {
            "linkedToReport": "uuid-1",
          },
          "payload": {
            "clientId": 10,
            "currency": "EUR",
            "description": "Project: Test Project

      Linked Reports:
        1. Contractor #1
           Hours: 8.00h
           Rate: 75.00 EUR/h
           Amount: 600.00 EUR

      Total: 600.00 EUR",
            "invoiceDate": [Date:2024-01-01],
            "invoiceNumber": "INV-2024-01-WS1",
            "totalGross": 600,
            "totalNet": 600,
            "workspaceId": 1,
          },
          "type": "billing",
          "uuid": "uuid-7",
        },
        {
          "constraints": {
            "linkedToReport": "uuid-4",
          },
          "payload": {
            "clientId": 10,
            "currency": "USD",
            "description": "Project: Test Project

      Linked Reports:
        1. Contractor #1
           Hours: 8.00h
           Rate: 100.00 USD/h
           Amount: 800.00 USD

      Total: 800.00 USD",
            "invoiceDate": [Date:2024-01-01],
            "invoiceNumber": "INV-2024-01-WS1",
            "totalGross": 800,
            "totalNet": 800,
            "workspaceId": 1,
          },
          "type": "billing",
          "uuid": "uuid-9",
        },
      ]
    `);
  });

  it("should use workspace fallback when contractor not in map", () => {
    const timeEntries = [
      {
        id: "entry1",
        contractorId: 1,
        roleId: "role1",
        activityId: "activity1",
        taskId: "task1",
        projectId: "project1",
        startAt: new Date("2024-01-01T09:00:00Z"),
        endAt: new Date("2024-01-01T17:00:00Z"), // 8 hours
        createdAt: new Date(),
        updatedAt: new Date(),
        note: null,
      },
    ];

    const generatedReport = createMockGeneratedReport(timeEntries);
    const projectIteration = createMockProjectIteration();
    const project = createMockProject({ workspaceIds: [5, 6] });
    const contractorWorkspaceMap = new Map(); // Empty map
    const uuidFactory = createCounterBasedUuidFactory();

    const facts = convertGeneratedReportToFacts(
      generatedReport,
      projectIteration,
      project,
      contractorWorkspaceMap,
      new Map(),
      uuidFactory,
    );

    const reportFact = facts.find((f) => f.type === "report") as ReportFact;
    expect([reportFact]).toMatchInlineSnapshot(`
      [
        {
          "billingAmount": 600,
          "billingCurrency": "EUR",
          "billingUnitPrice": 75,
          "payload": {
            "clientId": 10,
            "contractorId": 1,
            "currency": "EUR",
            "description": "Project: Test Project
      Period: 2024-01-01 to 2024-01-31
      Hours: 8.00h
      Internal Rate: 50.00 EUR/h
      External Rate: 75.00 EUR/h

      Report Value (Internal): 400.00 EUR
      Billing Value (External): 600.00 EUR",
            "netValue": 400,
            "periodEnd": [Date:2024-01-31],
            "periodStart": [Date:2024-01-01],
            "projectIterationId": 1,
            "quantity": 8,
            "unit": "h",
            "unitPrice": 50,
            "workspaceId": 5,
          },
          "type": "report",
          "uuid": "uuid-1",
        },
      ]
    `);
  });

  it("should round values to 2 decimal places", () => {
    const timeEntries = [
      {
        id: "entry1",
        contractorId: 1,
        roleId: "role1",
        activityId: "activity1",
        taskId: "task1",
        projectId: "project1",
        startAt: new Date("2024-01-01T09:00:00Z"),
        endAt: new Date("2024-01-01T09:30:00Z"), // 0.5 hours
        createdAt: new Date(),
        updatedAt: new Date(),
        note: null,
      },
    ];

    const rates = [
      createMockRoleRate({
        costRate: 33.333,
        billingRate: 66.666,
      }),
    ];

    const generatedReport = createMockGeneratedReport(timeEntries, rates);
    const projectIteration = createMockProjectIteration();
    const project = createMockProject();
    const contractorWorkspaceMap = new Map([[1, 1]]);
    const uuidFactory = createCounterBasedUuidFactory();

    const facts = convertGeneratedReportToFacts(
      generatedReport,
      projectIteration,
      project,
      contractorWorkspaceMap,
      new Map(),
      uuidFactory,
    );

    const reportFact = facts.find((f) => f.type === "report") as ReportFact;
    expect([reportFact]).toMatchInlineSnapshot(`
      [
        {
          "billingAmount": 33.33,
          "billingCurrency": "EUR",
          "billingUnitPrice": 66.67,
          "payload": {
            "clientId": 10,
            "contractorId": 1,
            "currency": "EUR",
            "description": "Project: Test Project
      Period: 2024-01-01 to 2024-01-31
      Hours: 0.50h
      Internal Rate: 33.33 EUR/h
      External Rate: 66.67 EUR/h

      Report Value (Internal): 16.67 EUR
      Billing Value (External): 33.33 EUR",
            "netValue": 16.67,
            "periodEnd": [Date:2024-01-31],
            "periodStart": [Date:2024-01-01],
            "projectIterationId": 1,
            "quantity": 0.5,
            "unit": "h",
            "unitPrice": 33.33,
            "workspaceId": 1,
          },
          "type": "report",
          "uuid": "uuid-1",
        },
      ]
    `);
  });

  it("should skip entries without matching rates", () => {
    const rates = [
      createMockRoleRate({
        activityTypes: ["activity1"], // Only matches activity1
      }),
    ];

    const timeEntries = [
      {
        id: "entry1",
        contractorId: 1,
        roleId: "role1",
        activityId: "activity1",
        taskId: "task1",
        projectId: "project1",
        startAt: new Date("2024-01-01T09:00:00Z"),
        endAt: new Date("2024-01-01T17:00:00Z"), // 8 hours
        createdAt: new Date(),
        updatedAt: new Date(),
        note: null,
      },
      {
        id: "entry2",
        contractorId: 1,
        roleId: "role1",
        activityId: "activity2", // No matching rate
        taskId: "task1",
        projectId: "project1",
        startAt: new Date("2024-01-02T09:00:00Z"),
        endAt: new Date("2024-01-02T17:00:00Z"), // 8 hours
        createdAt: new Date(),
        updatedAt: new Date(),
        note: null,
      },
    ];

    const generatedReport = createMockGeneratedReport(timeEntries, rates);
    const projectIteration = createMockProjectIteration();
    const project = createMockProject();
    const contractorWorkspaceMap = new Map([[1, 1]]);

    // Mock console.warn to avoid noise in tests
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const uuidFactory = createCounterBasedUuidFactory();

    const facts = convertGeneratedReportToFacts(
      generatedReport,
      projectIteration,
      project,
      contractorWorkspaceMap,
      new Map(),
      uuidFactory,
    );

    // Should only have facts for entry1 (entry2 skipped)
    const reportFact = facts.find((f) => f.type === "report") as ReportFact;
    expect([reportFact]).toMatchInlineSnapshot(`
      [
        {
          "billingAmount": 600,
          "billingCurrency": "EUR",
          "billingUnitPrice": 75,
          "payload": {
            "clientId": 10,
            "contractorId": 1,
            "currency": "EUR",
            "description": "Project: Test Project
      Period: 2024-01-01 to 2024-01-31
      Hours: 8.00h
      Internal Rate: 50.00 EUR/h
      External Rate: 75.00 EUR/h

      Report Value (Internal): 400.00 EUR
      Billing Value (External): 600.00 EUR",
            "netValue": 400,
            "periodEnd": [Date:2024-01-31],
            "periodStart": [Date:2024-01-01],
            "projectIterationId": 1,
            "quantity": 8,
            "unit": "h",
            "unitPrice": 50,
            "workspaceId": 1,
          },
          "type": "report",
          "uuid": "uuid-1",
        },
      ]
    `);

    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it("should create link facts with correct breakdown information", () => {
    const timeEntries = [
      {
        id: "entry1",
        contractorId: 1,
        roleId: "role1",
        activityId: "activity1",
        taskId: "task1",
        projectId: "project1",
        startAt: new Date("2024-01-01T09:00:00Z"),
        endAt: new Date("2024-01-01T17:00:00Z"), // 8 hours
        createdAt: new Date(),
        updatedAt: new Date(),
        note: null,
      },
    ];

    const generatedReport = createMockGeneratedReport(timeEntries);
    const projectIteration = createMockProjectIteration();
    const project = createMockProject();
    const contractorWorkspaceMap = new Map([[1, 1]]);
    const uuidFactory = createCounterBasedUuidFactory();

    const facts = convertGeneratedReportToFacts(
      generatedReport,
      projectIteration,
      project,
      contractorWorkspaceMap,
      new Map(),
      uuidFactory,
    );

    const linkFacts = facts.filter(
      (f) => f.type === "linkCostReport" || f.type === "linkBillingReport",
    );
    expect(linkFacts).toMatchInlineSnapshot(`
      [
        {
          "payload": {
            "breakdown": {
              "costCurrency": "EUR",
              "costUnitPrice": 50,
              "exchangeRate": 1,
              "quantity": 8,
              "reportCurrency": "EUR",
              "reportUnitPrice": 50,
              "unit": "h",
            },
            "costAmount": 400,
            "costId": null,
            "description": "Link between cost and report for contractor 1",
            "reportAmount": 400,
            "reportId": null,
          },
          "type": "linkCostReport",
          "uuid": "uuid-3",
        },
        {
          "payload": {
            "billingAmount": 600,
            "billingId": 0,
            "breakdown": {
              "billingCurrency": "EUR",
              "billingUnitPrice": 75,
              "quantity": 8,
              "reportCurrency": "EUR",
              "reportUnitPrice": 50,
              "unit": "h",
            },
            "description": "Link between billing and report for contractor 1",
            "linkType": "reconcile",
            "reportAmount": 400,
            "reportId": 0,
          },
          "type": "linkBillingReport",
          "uuid": "uuid-5",
        },
      ]
    `);
  });

  it("should set correct invoice numbers and dates", () => {
    const timeEntries = [
      {
        id: "entry1",
        contractorId: 1,
        roleId: "role1",
        activityId: "activity1",
        taskId: "task1",
        projectId: "project1",
        startAt: new Date("2024-01-01T09:00:00Z"),
        endAt: new Date("2024-01-01T17:00:00Z"), // 8 hours
        createdAt: new Date(),
        updatedAt: new Date(),
        note: null,
      },
    ];

    const generatedReport = createMockGeneratedReport(timeEntries);
    const projectIteration = createMockProjectIteration({
      periodStart: new CalendarDate(2024, 3, 15),
    });
    const project = createMockProject();
    const contractorWorkspaceMap = new Map([[1, 1]]);
    const uuidFactory = createCounterBasedUuidFactory();

    const facts = convertGeneratedReportToFacts(
      generatedReport,
      projectIteration,
      project,
      contractorWorkspaceMap,
      new Map(),
      uuidFactory,
    );

    const costFact = facts.find((f) => f.type === "cost") as CostFact;
    const billingFact = facts.find((f) => f.type === "billing") as BillingFact;
    expect([costFact, billingFact]).toMatchInlineSnapshot(`
      [
        {
          "constraints": {
            "linkedToReport": "uuid-1",
          },
          "payload": {
            "contractorId": 1,
            "counterparty": null,
            "currency": "EUR",
            "description": "Project: Test Project
      Contractor: Contractor #1
      Hours: 8.00h
      Internal Rate: 50.00 EUR/h
      Cost Value: 400.00 EUR",
            "grossValue": 400,
            "invoiceDate": [Date:2024-03-15],
            "invoiceNumber": "COST-2024-03-1",
            "netValue": 400,
            "workspaceId": 1,
          },
          "type": "cost",
          "uuid": "uuid-2",
        },
        {
          "constraints": {
            "linkedToReport": "uuid-1",
          },
          "payload": {
            "clientId": 10,
            "currency": "EUR",
            "description": "Project: Test Project

      Linked Reports:
        1. Contractor #1
           Hours: 8.00h
           Rate: 75.00 EUR/h
           Amount: 600.00 EUR

      Total: 600.00 EUR",
            "invoiceDate": [Date:2024-03-15],
            "invoiceNumber": "INV-2024-03-WS1",
            "totalGross": 600,
            "totalNet": 600,
            "workspaceId": 1,
          },
          "type": "billing",
          "uuid": "uuid-4",
        },
      ]
    `);
  });
});
