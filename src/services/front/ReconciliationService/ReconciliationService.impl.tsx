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
import { produce } from "immer";
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
 * Helper: Check if a report matches a fact
 */
function matchesReport(
  report: Report,
  fact: ReportFact & {
    billingAmount: number;
    billingCurrency: string;
    billingUnitPrice: number;
  },
): boolean {
  const factUnitPrice = fact.payload.unitPrice ?? 0;
  const rUnitPrice = report.unitPrice ?? 0;
  const matchesContractor = report.contractorId === fact.payload.contractorId;
  const matchesCurrency = report.currency === fact.payload.currency;
  const matchesIteration =
    report.projectIterationId === fact.payload.projectIterationId;
  const matchesPeriod =
    report.periodStart.toString() === fact.payload.periodStart.toString() &&
    report.periodEnd.toString() === fact.payload.periodEnd.toString();
  const matchesUnitPrice = Math.abs(rUnitPrice - factUnitPrice) < 0.01;

  return (
    matchesContractor &&
    matchesCurrency &&
    matchesIteration &&
    matchesPeriod &&
    matchesUnitPrice
  );
}

/**
 * Helper: Check if a billing matches a fact
 */
function matchesBilling(
  billing: Billing,
  fact: BillingFact,
  iteration: ProjectIteration,
): boolean {
  const matchesWorkspace = billing.workspaceId === fact.payload.workspaceId;
  const matchesCurrency = billing.currency === fact.payload.currency;
  const matchesPeriod =
    iteration.periodStart.compare(billing.invoiceDate) <= 0 &&
    billing.invoiceDate.compare(iteration.periodEnd) <= 0;
  return matchesWorkspace && matchesCurrency && matchesPeriod;
}

/**
 * Helper: Check if a cost matches a fact
 */
function matchesCost(cost: Cost, fact: CostFact, iteration: ProjectIteration): boolean {
  const matchesContractor =
    cost.contractor?.id === fact.payload.contractorId ||
    (cost.contractor === null && fact.payload.contractorId === null);
  const matchesPeriod =
    iteration.periodStart.compare(cost.invoiceDate) <= 0 &&
    cost.invoiceDate.compare(iteration.periodEnd) <= 0;
  return matchesContractor && matchesPeriod;
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

    // Step 1: Generate facts from the generated report (all start with action: ignore)
    const facts = convertGeneratedReportToFacts(
      input.report,
      input.iteration,
      input.project,
      input.contractorWorkspaceMap,
      input.contractorNameMap,
      uuidFactory,
    );

    // Step 2: Match report facts and update actions
    const reportIdToFact = new Map<number, string>(); // existingReport.id -> factUUID
    const iterationReportIds = new Set(existingReports.map((r) => r.id));

    // Find costs that are already linked to reports in this iteration
    const linkedCosts = input.costs.filter((cost) => {
      if (!cost.linkReports || cost.linkReports.length === 0) {
        return false;
      }
      return cost.linkReports.some(
        (linkReport) =>
          linkReport.report && iterationReportIds.has(linkReport.report.id),
      );
    });

    // Find billings that are eligible for reconciliation:
    // - Not linked to anything, OR
    // - Linked only to reports in this iteration
    const eligibleBillings = input.billings.filter((billing) => {
      if (
        !billing.linkBillingReport ||
        billing.linkBillingReport.length === 0
      ) {
        return true;
      }
      return billing.linkBillingReport.every(
        (linkEntry) =>
          linkEntry.report && iterationReportIds.has(linkEntry.report.id),
      );
    });

    // Build sets of existing links for quick lookup
    const existingCostReportLinks = new Set<string>();
    for (const cost of input.costs) {
      if (cost.linkReports) {
        for (const linkEntry of cost.linkReports) {
          if (linkEntry.report && linkEntry.link.costId !== null) {
            const key = `${cost.id}-${linkEntry.report.id}`;
            existingCostReportLinks.add(key);
          }
        }
      }
    }

    const existingBillingReportLinks = new Set<string>();
    for (const billing of input.billings) {
      if (billing.linkBillingReport) {
        for (const linkEntry of billing.linkBillingReport) {
          if (linkEntry.report && linkEntry.link.billingId !== null) {
            const key = `${linkEntry.link.billingId}-${linkEntry.report.id}`;
            existingBillingReportLinks.add(key);
          }
        }
      }
    }

    // Step 4: Use immer to immutably update facts
    return produce(facts, (draft: Fact[]) => {
      // First pass: Match report facts
      for (const fact of draft) {
        switch (fact.type) {
          case "report": {
            const reportFact = fact as ReportFact & {
              billingAmount: number;
              billingCurrency: string;
              billingUnitPrice: number;
            };
            const existingReport = existingReports.find((r) =>
              matchesReport(r, reportFact),
            );

            if (existingReport) {
              fact.action = {
                type: "update",
                id: existingReport.id,
                oldValues: {
                  netValue: existingReport.netValue,
                  unit: existingReport.unit ?? null,
                  quantity: existingReport.quantity ?? null,
                  unitPrice: existingReport.unitPrice ?? null,
                  currency: existingReport.currency,
                },
              };
              reportIdToFact.set(existingReport.id, fact.uuid);
            } else {
              fact.action = { type: "create" };
            }
            break;
          }
        }
      }

      // Build UUID index for faster lookup of linked facts
      const draftUuidToFact = new Map<string, Fact>();
      for (const f of draft) {
        draftUuidToFact.set(f.uuid, f);
      }

      // Second pass: Match cost and billing facts, and update link facts
      for (const fact of draft) {
        switch (fact.type) {
          case "cost": {
            const costFact = fact as CostFact;
            if (!costFact.payload.workspaceId) {
              continue; // Skip if no workspaceId
            }
            const existingCost = linkedCosts.find((c) =>
              matchesCost(c, costFact, input.iteration),
            );

            if (existingCost) {
              fact.action = {
                type: "update",
                id: existingCost.id,
                oldValues: {
                  netValue: existingCost.netValue,
                  grossValue: existingCost.grossValue ?? null,
                  currency: existingCost.currency,
                },
              };
            } else {
              fact.action = { type: "create" };
            }
            break;
          }
          case "billing": {
            const billingFact = fact as BillingFact;
            const existingBilling = eligibleBillings.find((b) =>
              matchesBilling(b, billingFact, input.iteration),
            );

            if (existingBilling) {
              fact.action = {
                type: "update",
                id: existingBilling.id,
                oldValues: {
                  totalNet: existingBilling.totalNet,
                  totalGross: existingBilling.totalGross,
                  currency: existingBilling.currency,
                },
              };
            } else {
              fact.action = { type: "create" };
            }
            break;
          }
          case "linkCostReport": {
            const linkFact = fact as LinkCostReportFact;
            let costFact: CostFact | undefined;
            let reportFact: ReportFact | undefined;

            // Find linked cost and report facts from draft (to get updated actions)
            for (const factUuid of linkFact.linkedFacts) {
              const linkedFact = draftUuidToFact.get(factUuid);
              if (!linkedFact) continue;
              switch (linkedFact.type) {
                case "cost":
                  costFact = linkedFact as CostFact;
                  break;
                case "report":
                  reportFact = linkedFact as ReportFact;
                  break;
              }
            }

            if (reportFact && costFact) {
              const costId =
                costFact.action.type === "update" ? costFact.action.id : null;
              const reportId =
                reportFact.action.type === "update" ? reportFact.action.id : null;

              // Update payload with resolved IDs
              linkFact.payload.costId = costId;
              linkFact.payload.reportId = reportId;

              // Check if link already exists (only if both IDs are available)
              if (costId !== null && reportId !== null) {
                const linkKey = `${costId}-${reportId}`;
                if (existingCostReportLinks.has(linkKey)) {
                  fact.action = { type: "ignore" };
                  continue;
                }
              }

              // Create new link (even if IDs are null, they'll be resolved during execution)
              fact.action = { type: "create" };
            } else {
              // If linked facts not found, keep as ignore
              fact.action = { type: "ignore" };
            }
            break;
          }
          case "linkBillingReport": {
            const linkFact = fact as LinkBillingReportFact;
            let billingFact: BillingFact | undefined;
            let reportFact: ReportFact | undefined;

            // Find linked billing and report facts from draft (to get updated actions)
            for (const factUuid of linkFact.linkedFacts) {
              const linkedFact = draftUuidToFact.get(factUuid);
              if (!linkedFact) continue;
              switch (linkedFact.type) {
                case "billing":
                  billingFact = linkedFact as BillingFact;
                  break;
                case "report":
                  reportFact = linkedFact as ReportFact;
                  break;
              }
            }

            if (reportFact && billingFact) {
              const billingId =
                billingFact.action.type === "update"
                  ? billingFact.action.id
                  : 0;
              const reportId =
                reportFact.action.type === "update" ? reportFact.action.id : 0;

              // Update payload with resolved IDs
              linkFact.payload.billingId = billingId;
              linkFact.payload.reportId = reportId;

              // Check if link already exists (only if both IDs are available)
              if (billingId !== 0 && reportId !== 0) {
                const linkKey = `${billingId}-${reportId}`;
                if (existingBillingReportLinks.has(linkKey)) {
                  fact.action = { type: "ignore" };
                  continue;
                }
              }

              // Create new link (even if IDs are 0, they'll be resolved during execution)
              fact.action = { type: "create" };
            } else {
              // If linked facts not found, keep as ignore
              fact.action = { type: "ignore" };
            }
            break;
          }
        }
      }
    });
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
                  const result =
                    await config.services.mutationService.createReport(
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
                  const result =
                    await config.services.mutationService.createCost(
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
                  linkPayload as typeof fact.payload & {
                    costId: number;
                    reportId: number;
                  },
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
              });
              if (!dryRun) {
                // For actual API call, ensure IDs are numbers
                const linkPayload = {
                  ...fact.payload,
                  billingId: typeof billingId === "string" ? 0 : billingId,
                  reportId: typeof reportId === "string" ? 0 : reportId,
                };
                await config.services.mutationService.linkReportAndBilling(
                  linkPayload as typeof fact.payload & {
                    billingId: number;
                    reportId: number;
                  },
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
