import { Billing, billingQueryUtils } from "@/api/billing/billing.api.ts";
import { Cost, costQueryUtils } from "@/api/cost/cost.api.ts";
import type { GeneratedReportSource } from "@/api/generated-report-source/generated-report-source.api.ts";
import { ProjectIteration } from "@/api/project-iteration/project-iteration.api.ts";
import { Report, reportQueryUtils } from "@/api/reports/reports.api.ts";
import { WithServices } from "@/platform/typescript/services.ts";
import { WithReportDisplayService } from "@/services/front/ReportDisplayService/ReportDisplayService.ts";
import { WithBillingService } from "@/services/io/BillingService/BillingService.ts";
import { WithCostService } from "@/services/io/CostService/CostService.ts";
import { WithMutationService } from "@/services/io/MutationService/MutationService.ts";
import { WithProjectService } from "@/services/io/ProjectService/ProjectService.ts";
import { rd } from "@passionware/monads";
import { v5 as uuidv5 } from "uuid";
import { convertGeneratedReportToFacts } from "./convertGeneratedReportToFacts.ts";
import {
  ExecuteReconciliationParams,
  ReconciliationInput,
  ReconciliationService,
  UseReconciliationViewParams,
} from "./ReconciliationService.ts";
import {
  BillingFact,
  CostFact,
  Fact,
  LinkBillingReportFact,
  LinkCostReportFact,
  ReportFact,
} from "./ReconciliationService.types.ts";

/**
 * Matches report facts against existing reports and sets action (create/update)
 */
function matchReportFacts(
  reportFacts: Array<
    ReportFact & {
      billingAmount: number;
      billingCurrency: string;
      billingUnitPrice: number;
    }
  >,
  existingReports: Report[],
): ReportFact[] {
  const matchedFacts: ReportFact[] = [];

  for (const fact of reportFacts) {
    // Find existing report matching contractor, currency, project iteration, and unit price
    const factUnitPrice = fact.payload.unitPrice ?? 0;
    const existingReport = existingReports.find((r) => {
      const rUnitPrice = r.unitPrice ?? 0;
      return (
        r.contractorId === fact.payload.contractorId &&
        r.currency === fact.payload.currency &&
        r.projectIterationId === fact.payload.projectIterationId &&
        Math.abs(rUnitPrice - factUnitPrice) < 0.01
      );
    });

    if (existingReport) {
      // Update existing report
      matchedFacts.push({
        ...fact,
        action: {
          type: "update",
          id: existingReport.id,
          oldValues: {
            netValue: existingReport.netValue,
            unit: existingReport.unit ?? null,
            quantity: existingReport.quantity ?? null,
            unitPrice: existingReport.unitPrice ?? null,
            currency: existingReport.currency,
          },
        },
      });
    } else {
      // Create new report
      matchedFacts.push({
        ...fact,
        action: { type: "create" },
      });
    }
  }

  return matchedFacts;
}

/**
 * Matches billing facts against existing billings and sets action (create/update)
 */
function matchBillingFacts(
  billingFacts: BillingFact[],
  existingBillings: Billing[],
  iteration: ProjectIteration,
): BillingFact[] {
  const matchedFacts: BillingFact[] = [];

  for (const fact of billingFacts) {
    // Find existing billing matching workspace, currency, and period
    const existingBilling = existingBillings.find((b) => {
      const matchesWorkspace = b.workspaceId === fact.payload.workspaceId;
      const matchesCurrency = b.currency === fact.payload.currency;
      const invoiceDate = new Date(
        iteration.periodStart.year,
        iteration.periodStart.month - 1,
        iteration.periodStart.day,
      );
      const periodStart = new Date(
        iteration.periodStart.year,
        iteration.periodStart.month - 1,
        iteration.periodStart.day,
      );
      const periodEnd = new Date(
        iteration.periodEnd.year,
        iteration.periodEnd.month - 1,
        iteration.periodEnd.day,
      );
      const matchesPeriod =
        invoiceDate >= periodStart && invoiceDate <= periodEnd;
      return matchesWorkspace && matchesCurrency && matchesPeriod;
    });

    if (existingBilling) {
      matchedFacts.push({
        ...fact,
        action: {
          type: "update",
          id: existingBilling.id,
          oldValues: {
            totalNet: existingBilling.totalNet,
            totalGross: existingBilling.totalGross,
            currency: existingBilling.currency,
          },
        },
      });
    } else {
      // Create new billing
      matchedFacts.push({
        ...fact,
        action: { type: "create" },
      });
    }
  }

  return matchedFacts;
}

/**
 * Matches cost facts against existing costs and sets action (create/update)
 */
function matchCostFacts(
  costFacts: CostFact[],
  existingCosts: Cost[],
  iteration: ProjectIteration,
): CostFact[] {
  const matchedFacts: CostFact[] = [];

  for (const fact of costFacts) {
    // Find existing cost matching contractor and period
    const existingCost = existingCosts.find((c) => {
      const matchesContractor =
        c.contractor?.id === fact.payload.contractorId ||
        (c.contractor === null && fact.payload.contractorId === null);
      const invoiceDate = new Date(
        iteration.periodStart.year,
        iteration.periodStart.month - 1,
        iteration.periodStart.day,
      );
      const periodStart = new Date(
        iteration.periodStart.year,
        iteration.periodStart.month - 1,
        iteration.periodStart.day,
      );
      const periodEnd = new Date(
        iteration.periodEnd.year,
        iteration.periodEnd.month - 1,
        iteration.periodEnd.day,
      );
      const matchesPeriod =
        invoiceDate >= periodStart && invoiceDate <= periodEnd;
      return matchesContractor && matchesPeriod;
    });

    if (existingCost) {
      // Update existing cost
      matchedFacts.push({
        ...fact,
        action: {
          type: "update",
          id: existingCost.id,
          oldValues: {
            netValue: existingCost.netValue,
            grossValue: existingCost.grossValue ?? null,
            currency: existingCost.currency,
          },
        },
      });
    } else {
      // Create new cost
      if (!fact.payload.workspaceId) {
        continue; // Skip if no workspaceId
      }
      matchedFacts.push({
        ...fact,
        action: { type: "create" },
      });
    }
  }

  return matchedFacts;
}

/**
 * Matches link facts and sets action (create/ignore if already exists)
 * Resolves IDs from matched facts
 */
function matchLinkFacts(
  linkCostReportFacts: LinkCostReportFact[],
  linkBillingReportFacts: LinkBillingReportFact[],
  reportFactUuidToFact: Map<string, ReportFact>,
  billingFactUuidToFact: Map<string, BillingFact>,
  costFactUuidToFact: Map<string, CostFact>,
  existingBillings: Billing[],
  existingCosts: Cost[],
): Fact[] {
  const matchedFacts: Fact[] = [];

  // Build a set of existing cost-report links for quick lookup
  const existingCostReportLinks = new Set<string>();
  for (const cost of existingCosts) {
    if (cost.linkReports) {
      for (const linkEntry of cost.linkReports) {
        if (linkEntry.report && linkEntry.link.costId !== null) {
          const key = `${cost.id}-${linkEntry.report.id}`;
          existingCostReportLinks.add(key);
        }
      }
    }
  }

  // Build a set of existing billing-report links for quick lookup
  const existingBillingReportLinks = new Set<string>();
  for (const billing of existingBillings) {
    if (billing.linkBillingReport) {
      for (const linkEntry of billing.linkBillingReport) {
        if (linkEntry.report && linkEntry.link.billingId !== null) {
          const key = `${linkEntry.link.billingId}-${linkEntry.report.id}`;
          existingBillingReportLinks.add(key);
        }
      }
    }
  }

  // Match cost-report links
  for (const linkFact of linkCostReportFacts) {
    // linkedFacts is an array of fact UUIDs - find cost and report facts
    let costFact: CostFact | undefined;
    let reportFact: ReportFact | undefined;

    for (const factUuid of linkFact.linkedFacts) {
      const cost = costFactUuidToFact.get(factUuid);
      const report = reportFactUuidToFact.get(factUuid);
      if (cost) costFact = cost;
      if (report) reportFact = report;
    }

    if (reportFact && costFact) {
      const costId =
        costFact.action.type === "update" ? costFact.action.id : null;
      const reportId =
        reportFact.action.type === "update" ? reportFact.action.id : null;

      // Check if link already exists
      if (costId !== null && reportId !== null) {
        const linkKey = `${costId}-${reportId}`;
        if (existingCostReportLinks.has(linkKey)) {
          // Link already exists - ignore
          matchedFacts.push({
            ...linkFact,
            action: { type: "ignore" },
            payload: {
              ...linkFact.payload,
              costId,
              reportId,
            },
          });
          continue;
        }
      }

      // Create new link
      matchedFacts.push({
        ...linkFact,
        action: { type: "create" },
        payload: {
          ...linkFact.payload,
          costId,
          reportId,
        },
      });
    }
  }

  // Match billing-report links
  for (const linkFact of linkBillingReportFacts) {
    // linkedFacts is an array of fact UUIDs - find report and billing facts
    let billingFact: BillingFact | undefined;
    let reportFact: ReportFact | undefined;

    for (const factUuid of linkFact.linkedFacts) {
      const billing = billingFactUuidToFact.get(factUuid);
      const report = reportFactUuidToFact.get(factUuid);
      if (billing) billingFact = billing;
      if (report) reportFact = report;
    }

    if (reportFact && billingFact) {
      const billingId =
        billingFact.action.type === "update" ? billingFact.action.id : 0;
      const reportId =
        reportFact.action.type === "update" ? reportFact.action.id : 0;

      // Check if link already exists
      if (billingId !== 0 && reportId !== 0) {
        const linkKey = `${billingId}-${reportId}`;
        if (existingBillingReportLinks.has(linkKey)) {
          // Link already exists - ignore
          matchedFacts.push({
            ...linkFact,
            action: { type: "ignore" },
            payload: {
              ...linkFact.payload,
              billingId,
              reportId,
            },
          });
          continue;
        }
      }

      // Create new link
      matchedFacts.push({
        ...linkFact,
        action: { type: "create" },
        payload: {
          ...linkFact.payload,
          billingId,
          reportId,
        },
      });
    }
  }

  return matchedFacts;
}

export function createReconciliationService(
  config: WithServices<
    [
      WithMutationService,
      WithReportDisplayService,
      WithBillingService,
      WithCostService,
      WithProjectService,
    ]
  >,
): ReconciliationService {
  // Create deterministic UUID factory based on report data
  const createDeterministicUuidFactory = (
    report: GeneratedReportSource,
    iterationId: number,
  ): (() => string) => {
    // Create a namespace UUID from report and iteration ID for deterministic UUIDs
    // Use a stable representation of time entries for consistent UUID generation
    const timeEntriesKey = JSON.stringify(
      report.data.timeEntries.map((e) => ({
        id: e.id,
        contractorId: e.contractorId,
        startAt: e.startAt.toISOString(),
        endAt: e.endAt.toISOString(),
        projectId: e.projectId,
        roleId: e.roleId,
      })),
    );
    const namespace = uuidv5(
      `${report.projectIterationId}-${iterationId}-${timeEntriesKey}`,
      uuidv5.DNS,
    );
    let counter = 0;
    return () => {
      counter++;
      return uuidv5(`${namespace}-${counter}`, uuidv5.DNS);
    };
  };

  // Internal calculation function
  const calculateReconciliationFactsImpl = (
    input: ReconciliationInput,
  ): Fact[] => {
    const existingReports = input.reportsView.entries.map(
      (e) => e.originalReport,
    );

    // Create deterministic UUID factory based on report data
    const uuidFactory = createDeterministicUuidFactory(
      input.report,
      input.iteration.id,
    );

    // Step 1: Generate facts from the generated report
    const facts = convertGeneratedReportToFacts(
      input.report,
      input.iteration,
      input.project,
      input.contractorWorkspaceMap,
      input.contractorNameMap,
      uuidFactory,
    );

    // Separate facts by type
    const reportFacts = facts.filter(
      (
        f,
      ): f is ReportFact & {
        billingAmount: number;
        billingCurrency: string;
        billingUnitPrice: number;
      } => f.type === "report",
    ) as Array<
      ReportFact & {
        billingAmount: number;
        billingCurrency: string;
        billingUnitPrice: number;
      }
    >;
    const billingFacts = facts.filter(
      (f): f is BillingFact => f.type === "billing",
    );
    const costFacts = facts.filter((f): f is CostFact => f.type === "cost");
    const linkCostReportFacts = facts.filter(
      (f): f is LinkCostReportFact => f.type === "linkCostReport",
    );
    const linkBillingReportFacts = facts.filter(
      (f): f is LinkBillingReportFact => f.type === "linkBillingReport",
    );

    // Step 2: Match facts against existing entities and set actions
    const matchedReportFacts = matchReportFacts(reportFacts, existingReports);

    // Reconciliation rules:
    // 1. Find costs only that are already linked to this report with any link
    //    (costs that have at least one link to reports in the iteration)
    const iterationReportIds = new Set(existingReports.map((r) => r.id));
    const linkedCosts = input.costs.filter((cost) => {
      if (!cost.linkReports || cost.linkReports.length === 0) {
        return false;
      }
      // Check if any link points to a report in the iteration
      return cost.linkReports.some(
        (linkReport) =>
          linkReport.report && iterationReportIds.has(linkReport.report.id),
      );
    });

    // 2. Find billings that are eligible for reconciliation:
    //    - Not linked to anything, OR
    //    - Linked only to reports in this iteration (and not linked to any other reports)
    const eligibleBillings = input.billings.filter((billing) => {
      if (!billing.linkBillingReport || billing.linkBillingReport.length === 0) {
        // Not linked to anything - eligible
        return true;
      }
      // Check if all links are to reports in this iteration
      const allLinksAreInIteration = billing.linkBillingReport.every(
        (linkEntry) =>
          linkEntry.report &&
          iterationReportIds.has(linkEntry.report.id),
      );
      return allLinksAreInIteration;
    });

    const matchedBillingFacts = matchBillingFacts(
      billingFacts,
      eligibleBillings,
      input.iteration,
    );

    const matchedCostFacts = matchCostFacts(
      costFacts,
      linkedCosts,
      input.iteration,
    );

    // Step 3: Create UUID mappings for link matching
    const reportFactUuidToFact = new Map<string, ReportFact>();
    for (const fact of matchedReportFacts) {
      reportFactUuidToFact.set(fact.uuid, fact);
    }

    const billingFactUuidToFact = new Map<string, BillingFact>();
    for (const fact of matchedBillingFacts) {
      billingFactUuidToFact.set(fact.uuid, fact);
    }

    const costFactUuidToFact = new Map<string, CostFact>();
    for (const fact of matchedCostFacts) {
      costFactUuidToFact.set(fact.uuid, fact);
    }

    // Step 4: Match link facts
    const matchedLinkFacts = matchLinkFacts(
      linkCostReportFacts,
      linkBillingReportFacts,
      reportFactUuidToFact,
      billingFactUuidToFact,
      costFactUuidToFact,
      input.billings,
      input.costs,
    );

    // Return all matched facts as a single array
    return [
      ...matchedReportFacts,
      ...matchedBillingFacts,
      ...matchedCostFacts,
      ...matchedLinkFacts,
    ];
  };

  return {
    calculateReconciliationFacts: calculateReconciliationFactsImpl,
    useReconciliationView: (params: UseReconciliationViewParams) => {
      // Get project to access clientId and workspaceIds
      const project = config.services.projectService.useProject(
        params.projectId,
      );

      // Get project contractors to build contractorWorkspaceMap
      const projectContractors =
        config.services.projectService.useProjectContractors(params.projectId);

      // Query for existing reports assigned to this iteration
      const reportsQuery = rd.tryMap(params.iteration, (iteration) =>
        reportQueryUtils
          .getBuilder(params.workspaceId, params.clientId)
          .build((q) => [
            q.withFilter("projectIterationId", {
              operator: "oneOf",
              value: [iteration.id],
            }),
          ]),
      );

      const reportsView =
        config.services.reportDisplayService.useReportView(reportsQuery);

      // Query for existing billings for this client/workspace
      const billingsQuery = billingQueryUtils
        .getBuilder(params.workspaceId, params.clientId)
        // todo we can add some jsonb filtering link_billing_reports -> reportId
        .build(() => []);

      const billings =
        config.services.billingService.useBillings(billingsQuery);

      // Query for existing costs for this workspace
      const costsQuery = costQueryUtils
        .getBuilder(params.workspaceId, params.clientId)
        // todo we can add some jsonb filtering link_cost_reports -> reportId
        .build(() => []);

      const costs = config.services.costService.useCosts(costsQuery);

      // Memoize contractor maps to ensure stable references
      const contractorMaps = rd.useMemoMap(
        rd.useStable(projectContractors),
        (contractors) => {
          const contractorWorkspaceMap = new Map<number, number>();
          const contractorNameMap = new Map<number, string>();
          for (const pc of contractors) {
            if (pc.workspaceId) {
              contractorWorkspaceMap.set(pc.contractor.id, pc.workspaceId);
            }
            // Build contractor name map - use fullName if available, otherwise name
            const contractorName = pc.contractor.fullName ?? pc.contractor.name;
            if (contractorName) {
              contractorNameMap.set(pc.contractor.id, contractorName);
            }
          }
          return { contractorWorkspaceMap, contractorNameMap };
        },
      );

      const reconciliationInput = rd.useMemoMap(
        rd.useStable(
          rd.combine({
            reportsView,
            billings,
            costs,
            iteration: params.iteration,
            project,
            contractorMaps,
          }),
        ),
        ({
          reportsView,
          billings,
          costs,
          iteration,
          project,
          contractorMaps,
        }) => {
          return {
            report: params.report,
            reportsView,
            billings,
            costs,
            iteration,
            project,
            contractorWorkspaceMap: contractorMaps.contractorWorkspaceMap,
            contractorNameMap: contractorMaps.contractorNameMap,
          };
        },
      );

      return rd.useMemoMap(reconciliationInput, (input) =>
        calculateReconciliationFactsImpl(input),
      );
    },

    executeReconciliation: async (params: ExecuteReconciliationParams) => {
      const { facts, dryRun = false, onLog } = params;

      // Build a map of UUID to fact for quick lookup
      const uuidToFact = new Map<string, Fact>();
      for (const fact of facts) {
        uuidToFact.set(fact.uuid, fact);
      }

      // Separate facts by type for topological sorting
      const reportFacts: ReportFact[] = [];
      const costFacts: CostFact[] = [];
      const billingFacts: BillingFact[] = [];
      const linkCostReportFacts: LinkCostReportFact[] = [];
      const linkBillingReportFacts: LinkBillingReportFact[] = [];

      for (const fact of facts) {
        if (fact.action.type === "ignore") {
          continue; // Skip ignored facts
        }
        switch (fact.type) {
          case "report":
            reportFacts.push(fact);
            break;
          case "cost":
            costFacts.push(fact);
            break;
          case "billing":
            billingFacts.push(fact);
            break;
          case "linkCostReport":
            linkCostReportFacts.push(fact);
            break;
          case "linkBillingReport":
            linkBillingReportFacts.push(fact);
            break;
        }
      }

      // Topologically sort facts:
      // Level 1: ReportFact, CostFact, BillingFact (independent)
      // Level 2: LinkCostReportFact, LinkBillingReportFact (depend on Level 1)
      const sortedFacts: Fact[] = [
        ...reportFacts,
        ...costFacts,
        ...billingFacts,
        ...linkCostReportFacts,
        ...linkBillingReportFacts,
      ];

      // Map to track UUID -> ID for created/updated entities
      // In dry run, IDs are strings like "dry-1", "dry-2", etc.
      const uuidToId = new Map<string, number | string>();
      let dryRunCounter = 0;

      // Process facts in topological order
      for (const fact of sortedFacts) {
        switch (fact.type) {
          case "report": {
            switch (fact.action.type) {
              case "create": {
                onLog?.({
                  type: "create",
                  entityType: "report",
                  description: `Create report for contractor ${fact.payload.contractorId}`,
                  payload: JSON.parse(JSON.stringify(fact.payload)),
                  factUuid: fact.uuid,
                });
                if (!dryRun) {
                  const result = await config.services.mutationService.createReport(
                    fact.payload,
                  );
                  uuidToId.set(fact.uuid, result.id);
                  onLog?.({
                    type: "create",
                    entityType: "report",
                    description: `Created report for contractor ${fact.payload.contractorId}`,
                    id: result.id,
                    payload: JSON.parse(JSON.stringify(fact.payload)),
                    factUuid: fact.uuid,
                  });
                } else {
                  // In dry run, use a sequential placeholder ID for dependency resolution
                  dryRunCounter++;
                  const dryRunId = `dry-${dryRunCounter}`;
                  uuidToId.set(fact.uuid, dryRunId);
                  onLog?.({
                    type: "create",
                    entityType: "report",
                    description: `Created report for contractor ${fact.payload.contractorId}`,
                    id: dryRunCounter, // Use counter as numeric ID for display
                    payload: JSON.parse(JSON.stringify(fact.payload)),
                    factUuid: fact.uuid,
                  });
                }
                break;
              }
              case "update": {
                onLog?.({
                  type: "update",
                  entityType: "report",
                  description: `Update report ${fact.action.id} for contractor ${fact.payload.contractorId}`,
                  id: fact.action.id,
                  payload: JSON.parse(JSON.stringify(fact.payload)),
                  oldValues: fact.action.oldValues
                    ? JSON.parse(JSON.stringify(fact.action.oldValues))
                    : undefined,
                  factUuid: fact.uuid,
                });
                if (!dryRun) {
                  await config.services.mutationService.editReport(
                    fact.action.id,
                    fact.payload,
                  );
                }
                uuidToId.set(fact.uuid, fact.action.id);
                break;
              }
              case "ignore":
                break;
            }
            break;
          }

          case "cost": {
            switch (fact.action.type) {
              case "create": {
                onLog?.({
                  type: "create",
                  entityType: "cost",
                  description: `Create cost for contractor ${fact.payload.contractorId ?? "N/A"}`,
                  payload: JSON.parse(JSON.stringify(fact.payload)),
                  factUuid: fact.uuid,
                });
                if (!dryRun) {
                  const result = await config.services.mutationService.createCost(
                    fact.payload,
                  );
                  uuidToId.set(fact.uuid, result.id);
                  onLog?.({
                    type: "create",
                    entityType: "cost",
                    description: `Created cost for contractor ${fact.payload.contractorId ?? "N/A"}`,
                    id: result.id,
                    payload: JSON.parse(JSON.stringify(fact.payload)),
                    factUuid: fact.uuid,
                  });
                } else {
                  dryRunCounter++;
                  const dryRunId = `dry-${dryRunCounter}`;
                  uuidToId.set(fact.uuid, dryRunId);
                  onLog?.({
                    type: "create",
                    entityType: "cost",
                    description: `Created cost for contractor ${fact.payload.contractorId ?? "N/A"}`,
                    id: dryRunCounter,
                    payload: JSON.parse(JSON.stringify(fact.payload)),
                    factUuid: fact.uuid,
                  });
                }
                break;
              }
              case "update": {
                onLog?.({
                  type: "update",
                  entityType: "cost",
                  description: `Update cost ${fact.action.id}`,
                  id: fact.action.id,
                  payload: JSON.parse(JSON.stringify(fact.payload)),
                  oldValues: fact.action.oldValues
                    ? JSON.parse(JSON.stringify(fact.action.oldValues))
                    : undefined,
                  factUuid: fact.uuid,
                });
                if (!dryRun) {
                  await config.services.mutationService.editCost(
                    fact.action.id,
                    fact.payload,
                  );
                }
                uuidToId.set(fact.uuid, fact.action.id);
                break;
              }
              case "ignore":
                break;
            }
            break;
          }

          case "billing": {
            switch (fact.action.type) {
              case "create": {
                onLog?.({
                  type: "create",
                  entityType: "billing",
                  description: `Create billing for workspace ${fact.payload.workspaceId}`,
                  payload: JSON.parse(JSON.stringify(fact.payload)),
                  factUuid: fact.uuid,
                });
                if (!dryRun) {
                  const result =
                    await config.services.mutationService.createBilling(
                      fact.payload,
                    );
                  uuidToId.set(fact.uuid, result.id);
                  onLog?.({
                    type: "create",
                    entityType: "billing",
                    description: `Created billing for workspace ${fact.payload.workspaceId}`,
                    id: result.id,
                    payload: JSON.parse(JSON.stringify(fact.payload)),
                    factUuid: fact.uuid,
                  });
                } else {
                  dryRunCounter++;
                  const dryRunId = `dry-${dryRunCounter}`;
                  uuidToId.set(fact.uuid, dryRunId);
                  onLog?.({
                    type: "create",
                    entityType: "billing",
                    description: `Created billing for workspace ${fact.payload.workspaceId}`,
                    id: dryRunCounter,
                    payload: JSON.parse(JSON.stringify(fact.payload)),
                    factUuid: fact.uuid,
                  });
                }
                break;
              }
              case "update": {
                onLog?.({
                  type: "update",
                  entityType: "billing",
                  description: `Update billing ${fact.action.id}`,
                  id: fact.action.id,
                  payload: JSON.parse(JSON.stringify(fact.payload)),
                  oldValues: fact.action.oldValues
                    ? JSON.parse(JSON.stringify(fact.action.oldValues))
                    : undefined,
                  factUuid: fact.uuid,
                });
                if (!dryRun) {
                  await config.services.mutationService.editBilling(
                    fact.action.id,
                    fact.payload,
                  );
                }
                uuidToId.set(fact.uuid, fact.action.id);
                break;
              }
              case "ignore":
                break;
            }
            break;
          }

          case "linkCostReport": {
            // Resolve IDs from linked facts
            // In dry run, IDs can be strings like "dry-1", "dry-2", etc.
            let costId: number | string | null = null;
            let reportId: number | string | null = null;

            for (const linkedUuid of fact.linkedFacts) {
              const linkedFact = uuidToFact.get(linkedUuid);
              if (!linkedFact) continue;

              switch (linkedFact.type) {
                case "cost": {
                  switch (linkedFact.action.type) {
                    case "update":
                      costId = linkedFact.action.id;
                      break;
                    case "create": {
                      const createdId = uuidToId.get(linkedUuid);
                      if (createdId !== undefined) {
                        costId = createdId;
                      }
                      break;
                    }
                    case "ignore":
                      break;
                  }
                  break;
                }
                case "report": {
                  switch (linkedFact.action.type) {
                    case "update":
                      reportId = linkedFact.action.id;
                      break;
                    case "create": {
                      const createdId = uuidToId.get(linkedUuid);
                      if (createdId !== undefined) {
                        reportId = createdId;
                      }
                      break;
                    }
                    case "ignore":
                      break;
                  }
                  break;
                }
                case "billing":
                case "linkCostReport":
                case "linkBillingReport":
                  // Not relevant for cost-report links
                  break;
              }
            }

            // Only create link if both IDs are resolved
            if (costId !== null && reportId !== null) {
              // For logging, include the actual IDs (strings in dry run)
              const logPayload = {
                ...fact.payload,
                costId,
                reportId,
              };
              onLog?.({
                type: "create",
                entityType: "linkCostReport",
                description: `Link cost ${costId} to report ${reportId}`,
                payload: JSON.parse(JSON.stringify(logPayload)),
                factUuid: fact.uuid,
              });
              if (!dryRun) {
                // For actual API call, ensure IDs are numbers
                const linkPayload = {
                  ...fact.payload,
                  costId: typeof costId === "string" ? 0 : costId,
                  reportId: typeof reportId === "string" ? 0 : reportId,
                };
                await config.services.mutationService.linkCostAndReport(
                  linkPayload as typeof fact.payload & { costId: number; reportId: number },
                );
              }
            }
            break;
          }

          case "linkBillingReport": {
            // Resolve IDs from linked facts
            // In dry run, IDs can be strings like "dry-1", "dry-2", etc.
            let billingId: number | string | null = null;
            let reportId: number | string | null = null;

            for (const linkedUuid of fact.linkedFacts) {
              const linkedFact = uuidToFact.get(linkedUuid);
              if (!linkedFact) continue;

              switch (linkedFact.type) {
                case "billing": {
                  switch (linkedFact.action.type) {
                    case "update":
                      billingId = linkedFact.action.id;
                      break;
                    case "create": {
                      const createdId = uuidToId.get(linkedUuid);
                      if (createdId !== undefined) {
                        billingId = createdId;
                      }
                      break;
                    }
                    case "ignore":
                      break;
                  }
                  break;
                }
                case "report": {
                  switch (linkedFact.action.type) {
                    case "update":
                      reportId = linkedFact.action.id;
                      break;
                    case "create": {
                      const createdId = uuidToId.get(linkedUuid);
                      if (createdId !== undefined) {
                        reportId = createdId;
                      }
                      break;
                    }
                    case "ignore":
                      break;
                  }
                  break;
                }
                case "cost":
                case "linkCostReport":
                case "linkBillingReport":
                  // Not relevant for billing-report links
                  break;
              }
            }

            // Only create link if both IDs are resolved
            if (billingId !== null && reportId !== null) {
              // For logging, include the actual IDs (strings in dry run)
              const logPayload = {
                ...fact.payload,
                billingId,
                reportId,
              };
              onLog?.({
                type: "create",
                entityType: "linkBillingReport",
                description: `Link billing ${billingId} to report ${reportId}`,
                payload: JSON.parse(JSON.stringify(logPayload)),
                factUuid: fact.uuid,
              });
              if (!dryRun) {
                // For actual API call, ensure IDs are numbers
                const linkPayload = {
                  ...fact.payload,
                  billingId: typeof billingId === "string" ? 0 : billingId,
                  reportId: typeof reportId === "string" ? 0 : reportId,
                };
                await config.services.mutationService.linkReportAndBilling(
                  linkPayload as typeof fact.payload & { billingId: number; reportId: number },
                );
              }
            }
            break;
          }
        }
      }
    },
  };
}
