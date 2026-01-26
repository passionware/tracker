import { billingQueryUtils } from "@/api/billing/billing.api.ts";
import { Billing } from "@/api/billing/billing.api.ts";
import { costQueryUtils } from "@/api/cost/cost.api.ts";
import { Cost } from "@/api/cost/cost.api.ts";
import { ProjectIteration } from "@/api/project-iteration/project-iteration.api.ts";
import { reportQueryUtils } from "@/api/reports/reports.api.ts";
import { Report } from "@/api/reports/reports.api.ts";
import { WithServices } from "@/platform/typescript/services.ts";
import { WithBillingService } from "@/services/io/BillingService/BillingService.ts";
import { WithCostService } from "@/services/io/CostService/CostService.ts";
import { WithMutationService } from "@/services/io/MutationService/MutationService.ts";
import { WithProjectService } from "@/services/io/ProjectService/ProjectService.ts";
import { WithReportDisplayService } from "@/services/front/ReportDisplayService/ReportDisplayService.ts";
import { rd, maybe } from "@passionware/monads";
import {
  BillingReconciliationPreview,
  CostReconciliationPreview,
  ExecuteReconciliationParams,
  ReconciliationInput,
  ReconciliationPreview,
  ReconciliationService,
  ReportBillingLinkPreview,
  ReportCostLinkPreview,
  ReportReconciliationPreview,
  UseReconciliationViewParams,
} from "./ReconciliationService.ts";
import { convertGeneratedReportToFacts } from "./convertGeneratedReportToFacts.ts";
import {
  ReportFact,
  BillingFact,
  CostFact,
  LinkCostReportFact,
  LinkBillingReportFact,
  Fact,
} from "./ReconciliationService.types.ts";
import { v5 as uuidv5 } from "uuid";
import type { GeneratedReportSource } from "@/api/generated-report-source/generated-report-source.api.ts";

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
 * Matches link facts and sets action (always create for links)
 * Resolves IDs from matched facts
 */
function matchLinkFacts(
  linkCostReportFacts: LinkCostReportFact[],
  linkBillingReportFacts: LinkBillingReportFact[],
  reportFactUuidToFact: Map<string, ReportFact>,
  billingFactUuidToFact: Map<string, BillingFact>,
  costFactUuidToFact: Map<string, CostFact>,
): Fact[] {
  const matchedFacts: Fact[] = [];

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
      matchedFacts.push({
        ...linkFact,
        action: { type: "create" },
        payload: {
          ...linkFact.payload,
          costId: costFact.action.type === "update" ? costFact.action.id : null,
          reportId:
            reportFact.action.type === "update" ? reportFact.action.id : null,
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
      matchedFacts.push({
        ...linkFact,
        action: { type: "create" },
        payload: {
          ...linkFact.payload,
          billingId:
            billingFact.action.type === "update" ? billingFact.action.id : 0,
          reportId:
            reportFact.action.type === "update" ? reportFact.action.id : 0,
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

    // 2. Find billings that are linked to reports
    //    (billings that have at least one link to any report)
    const linkedBillings = input.billings.filter(
      (billing) =>
        billing.linkBillingReport && billing.linkBillingReport.length > 0,
    );

    const matchedBillingFacts = matchBillingFacts(
      billingFacts,
      linkedBillings,
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
      const { preview, iteration, project, projectIterationId } = params;

      // Track created IDs for linking
      const reportIdMap = new Map<number, number>(); // oldId -> newId
      const billingIdMap = new Map<number, number>(); // oldId -> newId
      const costIdMap = new Map<number, number>(); // oldId -> newId

      // Reconcile Reports
      for (const reportPreview of preview.reports) {
        if (reportPreview.type === "create") {
          // Create new report - use workspaceId from payload (already set per contractor)
          const result = await config.services.mutationService.createReport({
            ...reportPreview.payload,
            periodStart: iteration.periodStart,
            periodEnd: iteration.periodEnd,
            clientId: project.clientId,
            workspaceId: reportPreview.payload.workspaceId,
            projectIterationId: projectIterationId,
          });
          reportIdMap.set(0, result.id); // Map placeholder 0 to actual ID
        } else {
          // Update existing report
          await config.services.mutationService.editReport(
            reportPreview.id,
            reportPreview.payload,
          );
          reportIdMap.set(reportPreview.id, reportPreview.id);
        }
      }

      // Reconcile Billings
      for (const billingPreview of preview.billings) {
        if (billingPreview.type === "create") {
          // Create new billing - use workspaceId from preview (already grouped by workspace)
          const result = await config.services.mutationService.createBilling({
            ...billingPreview.payload,
            clientId: project.clientId,
            workspaceId: billingPreview.workspaceId,
          });
          billingIdMap.set(0, result.id);
        } else {
          // Update existing billing
          await config.services.mutationService.editBilling(
            billingPreview.id,
            billingPreview.payload,
          );
          billingIdMap.set(billingPreview.id, billingPreview.id);
        }
      }

      // Reconcile Costs
      for (const costPreview of preview.costs) {
        if (costPreview.type === "create") {
          // Create new cost - use workspaceId from payload
          const result = await config.services.mutationService.createCost({
            ...costPreview.payload,
            workspaceId: costPreview.payload.workspaceId,
          });
          costIdMap.set(0, result.id);
        } else {
          // Update existing cost
          await config.services.mutationService.editCost(
            costPreview.id,
            costPreview.payload,
          );
          costIdMap.set(costPreview.id, costPreview.id);
        }
      }

      // Create/Update Report-Billing Links
      for (const link of preview.reportBillingLinks) {
        const actualReportId = reportIdMap.get(link.reportId) ?? link.reportId;
        const actualBillingId =
          billingIdMap.get(link.billingId) ?? link.billingId;

        if (actualReportId && actualBillingId) {
          if (link.type === "create") {
            await config.services.mutationService.linkReportAndBilling({
              ...link.payload,
              billingId: actualBillingId,
              reportId: actualReportId,
            });
          } else {
            await config.services.mutationService.updateBillingReportLink(
              link.id,
              link.payload,
            );
          }
        }
      }

      // Create/Update Report-Cost Links
      for (const link of preview.reportCostLinks) {
        const actualReportId = reportIdMap.get(link.reportId) ?? link.reportId;
        const actualCostId = costIdMap.get(link.costId) ?? link.costId;

        if (actualReportId && actualCostId) {
          if (link.type === "create") {
            await config.services.mutationService.linkCostAndReport({
              ...link.payload,
              costId: actualCostId as number | null,
              reportId: actualReportId as number | null,
            });
          } else {
            await config.services.mutationService.updateCostReportLink(
              link.id,
              {
                ...link.payload,
                costId: actualCostId as number | null,
                reportId: actualReportId as number | null,
              },
            );
          }
        }
      }
    },
  };
}
