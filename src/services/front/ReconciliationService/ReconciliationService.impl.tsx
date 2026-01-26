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
} from "./ReconciliationService.types.ts";

/**
 * Converts report facts to report reconciliation previews by matching against existing reports
 */
function convertReportFactsToPreviews(
  reportFacts: Array<ReportFact & { billingAmount: number; billingCurrency: string; billingUnitPrice: number }>,
  existingReports: Report[],
): ReportReconciliationPreview[] {
  const previews: ReportReconciliationPreview[] = [];

  for (const fact of reportFacts) {
    // Find existing report matching contractor, currency, project iteration, and unit price
    const factUnitPrice = fact.payload.unitPrice ?? 0;
    const existingReport = existingReports.find(
      (r) => {
        const rUnitPrice = r.unitPrice ?? 0;
        return (
          r.contractorId === fact.payload.contractorId &&
          r.currency === fact.payload.currency &&
          r.projectIterationId === fact.payload.projectIterationId &&
          Math.abs(rUnitPrice - factUnitPrice) < 0.01
        );
      },
    );

    const quantity = fact.payload.quantity ?? 0;
    const baseFields = {
      contractorId: fact.payload.contractorId,
      netValue: fact.payload.netValue,
      unit: fact.payload.unit ?? "h",
      quantity,
      unitPrice: fact.payload.unitPrice ?? 0,
      currency: fact.payload.currency,
      billingUnitPrice: fact.billingUnitPrice,
      billingCurrency: fact.billingCurrency,
      rateSignature: "", // Can be enhanced later if needed
    };

    if (existingReport) {
      // Update existing report
      previews.push({
        ...baseFields,
        type: "update",
        id: existingReport.id,
        payload: {
          netValue: fact.payload.netValue,
          unit: fact.payload.unit ?? "h",
          quantity,
          unitPrice: fact.payload.unitPrice ?? 0,
          currency: fact.payload.currency,
        },
        oldValues: {
          netValue: existingReport.netValue,
          unit: existingReport.unit ?? null,
          quantity: existingReport.quantity ?? null,
          unitPrice: existingReport.unitPrice ?? null,
          currency: existingReport.currency,
        },
      });
    } else {
      // Create new report
      previews.push({
        ...baseFields,
        type: "create",
        payload: {
          ...fact.payload,
          unit: fact.payload.unit ?? "h",
          quantity,
          unitPrice: fact.payload.unitPrice ?? 0,
        },
      });
    }
  }

  return previews;
}

/**
 * Converts billing facts to billing reconciliation previews by matching against existing billings
 */
function convertBillingFactsToPreviews(
  billingFacts: BillingFact[],
  existingBillings: Billing[],
  iteration: ProjectIteration,
): BillingReconciliationPreview[] {
  const previews: BillingReconciliationPreview[] = [];

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

    const baseFields = {
      workspaceId: fact.payload.workspaceId,
      totalNet: fact.payload.totalNet,
      totalGross: fact.payload.totalGross,
      currency: fact.payload.currency,
      invoiceNumber: fact.payload.invoiceNumber,
      invoiceDate: fact.payload.invoiceDate,
      description: fact.payload.description,
    };

    if (existingBilling) {
      // Update existing billing
      previews.push({
        ...baseFields,
        type: "update",
        id: existingBilling.id,
        payload: {
          totalNet: fact.payload.totalNet,
          totalGross: fact.payload.totalGross,
          currency: fact.payload.currency,
        },
        oldValues: {
          totalNet: existingBilling.totalNet,
          totalGross: existingBilling.totalGross,
          currency: existingBilling.currency,
        },
      });
    } else {
      // Create new billing
      previews.push({
        ...baseFields,
        type: "create",
        payload: {
          ...fact.payload,
          clientId: 0, // Will be filled in during execution
        },
      });
    }
  }

  return previews;
}

/**
 * Converts cost facts to cost reconciliation previews by matching against existing costs
 */
function convertCostFactsToPreviews(
  costFacts: CostFact[],
  existingCosts: Cost[],
  iteration: ProjectIteration,
): CostReconciliationPreview[] {
  const previews: CostReconciliationPreview[] = [];

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

    const contractorId = fact.payload.contractorId ?? null;
    const baseFields = {
      contractorId,
      netValue: fact.payload.netValue,
      grossValue: fact.payload.grossValue ?? null,
      currency: fact.payload.currency,
      invoiceNumber: fact.payload.invoiceNumber ?? null,
      counterparty: fact.payload.counterparty ?? null,
      invoiceDate: fact.payload.invoiceDate,
      description: fact.payload.description ?? null,
    };

    if (existingCost) {
      // Update existing cost
      previews.push({
        ...baseFields,
        type: "update",
        id: existingCost.id,
        payload: {
          netValue: fact.payload.netValue,
          grossValue: fact.payload.grossValue ?? null,
          currency: fact.payload.currency,
        },
        oldValues: {
          netValue: existingCost.netValue,
          grossValue: existingCost.grossValue ?? null,
          currency: existingCost.currency,
        },
      });
    } else {
      // Create new cost
      if (!fact.payload.workspaceId) {
        continue; // Skip if no workspaceId
      }
      previews.push({
        ...baseFields,
        type: "create",
        payload: {
          ...fact.payload,
          contractorId: contractorId !== null ? maybe.of(contractorId) : maybe.ofAbsent(),
          workspaceId: fact.payload.workspaceId,
        },
      });
    }
  }

  return previews;
}

/**
 * Converts link facts to link previews, matching report/billing/cost IDs from previews
 * Uses UUID mappings to match facts to their corresponding previews
 */
function convertLinkFactsToPreviews(
  linkCostReportFacts: LinkCostReportFact[],
  linkBillingReportFacts: LinkBillingReportFact[],
  reportFactUuidToPreview: Map<string, ReportReconciliationPreview>,
  billingFactUuidToPreview: Map<string, BillingReconciliationPreview>,
  costFactUuidToPreview: Map<string, CostReconciliationPreview>,
  reportFacts: Array<ReportFact & { billingAmount: number; billingCurrency: string; billingUnitPrice: number }>,
  billingFacts: BillingFact[],
  costFacts: CostFact[],
): {
  reportCostLinks: ReportCostLinkPreview[];
  reportBillingLinks: ReportBillingLinkPreview[];
} {
  const reportCostLinks: ReportCostLinkPreview[] = [];
  const reportBillingLinks: ReportBillingLinkPreview[] = [];

  // Create maps from fact to their related facts for link matching
  // LinkCostReportFact links a cost to a report - we need to find which cost and report facts match
  // Since link facts are created right after cost/report facts, we match by contractor and amounts
  
  // Build a map: reportFact UUID -> costFact UUID (via constraints.linkedToReport)
  const reportUuidToCostUuid = new Map<string, string>();
  for (const costFact of costFacts) {
    reportUuidToCostUuid.set(costFact.constraints.linkedToReport, costFact.uuid);
  }

  // Convert cost-report links
  for (const linkFact of linkCostReportFacts) {
    // Match link fact to report fact by matching amounts and contractor
    // The link fact was created for a specific report fact, so we match by amount
    const matchingReportFact = reportFacts.find(
      (rf) =>
        Math.abs(rf.payload.netValue - linkFact.payload.reportAmount) < 0.01 &&
        Math.abs(rf.payload.netValue - linkFact.payload.costAmount) < 0.01,
    );

    if (!matchingReportFact) continue;

    const reportPreview = reportFactUuidToPreview.get(matchingReportFact.uuid);
    const costUuid = reportUuidToCostUuid.get(matchingReportFact.uuid);
    const costPreview = costUuid ? costFactUuidToPreview.get(costUuid) : undefined;

    if (reportPreview && costPreview) {
      reportCostLinks.push({
        type: "create",
        reportId: reportPreview.type === "update" ? reportPreview.id : 0,
        costId: costPreview.type === "update" ? costPreview.id : 0,
        reportAmount: linkFact.payload.reportAmount,
        costAmount: linkFact.payload.costAmount,
        description: linkFact.payload.description,
        breakdown: linkFact.payload.breakdown,
        payload: {
          ...linkFact.payload,
          costId: costPreview.type === "update" ? costPreview.id : null,
          reportId: reportPreview.type === "update" ? reportPreview.id : null,
        },
      });
    }
  }

  // Build a map: billingFact UUID -> reportFact UUIDs (via constraints.linkedToReport)
  // Actually, billing facts link to a report via constraints.linkedToReport, but multiple reports can link to one billing
  // We need to match link facts by finding which report fact matches the link fact's reportAmount
  
  // Convert billing-report links
  for (const linkFact of linkBillingReportFacts) {
    // Match link fact to report fact by matching amounts
    const matchingReportFact = reportFacts.find(
      (rf) =>
        Math.abs(rf.billingAmount - linkFact.payload.billingAmount) < 0.01 &&
        Math.abs(rf.payload.netValue - linkFact.payload.reportAmount) < 0.01,
    );

    if (!matchingReportFact) continue;

    const reportPreview = reportFactUuidToPreview.get(matchingReportFact.uuid);
    
    // Find billing preview by matching the billing fact that links to this report
    // The billing fact's constraints.linkedToReport should match the report fact UUID
    const matchingBillingFact = billingFacts.find(
      (bf) => bf.constraints.linkedToReport === matchingReportFact.uuid,
    );
    const billingPreview = matchingBillingFact
      ? billingFactUuidToPreview.get(matchingBillingFact.uuid)
      : undefined;

    if (reportPreview && billingPreview) {
      reportBillingLinks.push({
        type: "create",
        reportId: reportPreview.type === "update" ? reportPreview.id : 0,
        billingId: billingPreview.type === "update" ? billingPreview.id : 0,
        reportAmount: linkFact.payload.reportAmount,
        billingAmount: linkFact.payload.billingAmount,
        description: linkFact.payload.description,
        breakdown: linkFact.payload.breakdown,
        payload: {
          ...linkFact.payload,
          billingId: billingPreview.type === "update" ? billingPreview.id : 0,
          reportId: reportPreview.type === "update" ? reportPreview.id : 0,
        },
      });
    }
  }

  return { reportCostLinks, reportBillingLinks };
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
  // Internal calculation function
  const calculateReconciliationViewImpl = (
    input: ReconciliationInput,
  ): ReconciliationPreview => {
    const existingReports = input.reportsView.entries.map(
      (e) => e.originalReport,
    );

    // Step 1: Generate facts from the generated report
    const facts = convertGeneratedReportToFacts(
      input.report,
      input.iteration,
      input.project,
      input.contractorWorkspaceMap,
    );

    // Separate facts by type
    const reportFacts = facts.filter(
      (f): f is ReportFact & { billingAmount: number; billingCurrency: string; billingUnitPrice: number } =>
        f.type === "report",
    ) as Array<ReportFact & { billingAmount: number; billingCurrency: string; billingUnitPrice: number }>;
    const billingFacts = facts.filter(
      (f): f is BillingFact => f.type === "billing",
    );
    const costFacts = facts.filter(
      (f): f is CostFact => f.type === "cost",
    );
    const linkCostReportFacts = facts.filter(
      (f): f is LinkCostReportFact => f.type === "linkCostReport",
    );
    const linkBillingReportFacts = facts.filter(
      (f): f is LinkBillingReportFact => f.type === "linkBillingReport",
    );

    // Step 2: Convert facts to previews by matching against existing entities
    const reportPreviews = convertReportFactsToPreviews(
      reportFacts,
      existingReports,
    );

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

    const billingPreviews = convertBillingFactsToPreviews(
      billingFacts,
      linkedBillings,
      input.iteration,
    );

    const costPreviews = convertCostFactsToPreviews(
      costFacts,
      linkedCosts,
      input.iteration,
    );

    // Step 3: Create UUID mappings for link conversion by matching facts to previews
    const reportFactUuidToPreview = new Map<string, ReportReconciliationPreview>();
    for (const fact of reportFacts) {
      const matchingPreview = reportPreviews.find(
        (preview) =>
          preview.contractorId === fact.payload.contractorId &&
          Math.abs(preview.netValue - fact.payload.netValue) < 0.01 &&
          preview.quantity === fact.payload.quantity &&
          preview.unitPrice === fact.payload.unitPrice,
      );
      if (matchingPreview) {
        reportFactUuidToPreview.set(fact.uuid, matchingPreview);
      }
    }

    const billingFactUuidToPreview = new Map<string, BillingReconciliationPreview>();
    for (const fact of billingFacts) {
      const matchingPreview = billingPreviews.find(
        (preview) =>
          preview.workspaceId === fact.payload.workspaceId &&
          preview.currency === fact.payload.currency &&
          Math.abs(preview.totalNet - fact.payload.totalNet) < 0.01,
      );
      if (matchingPreview) {
        billingFactUuidToPreview.set(fact.uuid, matchingPreview);
      }
    }

    const costFactUuidToPreview = new Map<string, CostReconciliationPreview>();
    for (const fact of costFacts) {
      const matchingPreview = costPreviews.find(
        (preview) =>
          preview.contractorId === fact.payload.contractorId &&
          Math.abs(preview.netValue - fact.payload.netValue) < 0.01 &&
          preview.currency === fact.payload.currency,
      );
      if (matchingPreview) {
        costFactUuidToPreview.set(fact.uuid, matchingPreview);
      }
    }

    // Step 4: Convert link facts to link previews
    const { reportCostLinks, reportBillingLinks } =
      convertLinkFactsToPreviews(
        linkCostReportFacts,
        linkBillingReportFacts,
        reportFactUuidToPreview,
        billingFactUuidToPreview,
        costFactUuidToPreview,
        reportFacts,
        billingFacts,
        costFacts,
      );

    return {
      reports: reportPreviews,
      billings: billingPreviews,
      costs: costPreviews,
      reportBillingLinks,
      reportCostLinks,
    };
  };

  return {
    useReconciliationView: (params: UseReconciliationViewParams) => {
      // Get project to access clientId and workspaceIds
      const project = config.services.projectService.useProject(
        params.projectId,
      );

      // Get project contractors to build contractorWorkspaceMap
      const projectContractors =
        config.services.projectService.useProjectContractors(
          params.projectId,
        );

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

      const reconciliationInput = rd.map(
        rd.combine({
          reportsView,
          billings,
          costs,
          iteration: params.iteration,
          project,
          projectContractors,
        }),
        ({ reportsView, billings, costs, iteration, project, projectContractors }) => {
          // Build contractorWorkspaceMap from project contractors
          const contractorWorkspaceMap = new Map<number, number>();
          for (const pc of projectContractors) {
            if (pc.workspaceId) {
              contractorWorkspaceMap.set(pc.contractor.id, pc.workspaceId);
            }
          }

          return {
            report: params.report,
            reportsView,
            billings,
            costs,
            iteration,
            project,
            contractorWorkspaceMap,
          };
        },
      );

      return rd.map(reconciliationInput, (input) =>
        calculateReconciliationViewImpl(input),
      );
    },

    calculateReconciliationView: calculateReconciliationViewImpl,

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
