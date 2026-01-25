import { billingQueryUtils } from "@/api/billing/billing.api.ts";
import { Billing } from "@/api/billing/billing.api.ts";
import { costQueryUtils } from "@/api/cost/cost.api.ts";
import { Cost } from "@/api/cost/cost.api.ts";
import { GeneratedReportSource } from "@/api/generated-report-source/generated-report-source.api.ts";
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
  ReportToUpdate,
  UseReconciliationViewParams,
} from "./ReconciliationService.ts";
import { calculateReportReconciliation } from "./calculateReportReconciliation.helper.ts";

function calculateBillingReconciliation(
  report: GeneratedReportSource,
  reportPreviews: ReportReconciliationPreview[],
  existingBillings: Billing[],
  iteration: ProjectIteration,
  workspaceId: number,
): BillingReconciliationPreview[] {
  // Group report previews by workspace and billing currency
  // Goal: 1 billing per workspace
  const groupedByWorkspaceCurrency = new Map<
    string,
    {
      workspaceId: number;
      billingCurrency: string;
      totalBillingNet: number;
      totalBillingGross: number;
    }
  >();

  // Process report previews and group by workspace + billing currency
  for (const reportPreview of reportPreviews) {
    const key = `${workspaceId}-${reportPreview.billingCurrency}`;

    if (!groupedByWorkspaceCurrency.has(key)) {
      groupedByWorkspaceCurrency.set(key, {
        workspaceId: workspaceId,
        billingCurrency: reportPreview.billingCurrency,
        totalBillingNet: 0,
        totalBillingGross: 0,
      });
    }

    const group = groupedByWorkspaceCurrency.get(key)!;
    // Calculate billing amount from report preview
    // The report preview already has billingUnitPrice, so we can calculate billing amount
    const billingAmount =
      reportPreview.quantity * reportPreview.billingUnitPrice;
    group.totalBillingNet += billingAmount;
    group.totalBillingGross += billingAmount; // For now, gross = net (can be adjusted)
  }

  const previews: BillingReconciliationPreview[] = [];

  // Calculate billing reconciliation for each workspace + currency group
  for (const [, group] of groupedByWorkspaceCurrency) {
    const totalNet = Math.round(group.totalBillingNet * 100) / 100;
    const totalGross = Math.round(group.totalBillingGross * 100) / 100;

    // Find existing billing for this workspace, currency, and period
    // Match by workspaceId, currency, and period overlap
    const existingBilling = existingBillings.find((b) => {
      // Check workspace match
      const matchesWorkspace = b.workspaceId === group.workspaceId;
      // Check currency match
      const matchesCurrency = b.currency === group.billingCurrency;
      // Check period overlap (invoice date within iteration period)
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

    // Generate invoice number if creating new
    const invoiceNumber = existingBilling
      ? existingBilling.invoiceNumber
      : `INV-${iteration.periodStart.year}-${String(iteration.periodStart.month).padStart(2, "0")}-WS${group.workspaceId}`;

    const baseBillingFields = {
      workspaceId: group.workspaceId,
      totalNet,
      totalGross,
      currency: group.billingCurrency,
      invoiceNumber,
      invoiceDate: iteration.periodStart, // Use period start as invoice date
      description: `Generated from report #${report.id}`,
    };

    if (existingBilling) {
      // Update existing billing
      previews.push({
        ...baseBillingFields,
        type: "update",
        id: existingBilling.id,
        payload: {
          totalNet,
          totalGross,
          currency: group.billingCurrency,
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
        ...baseBillingFields,
        type: "create",
        payload: {
          ...baseBillingFields,
          clientId: 0, // Will be filled in during execution
        },
      });
    }
  }

  return previews;
}

function calculateCostReconciliation(
  report: GeneratedReportSource,
  reportPreviews: ReportReconciliationPreview[],
  existingCosts: Cost[],
  iteration: ProjectIteration,
): CostReconciliationPreview[] {
  // Goal: 1 cost per contractor
  // Group report previews by contractor
  const groupedByContractor = new Map<
    number,
    {
      contractorId: number;
      reports: ReportReconciliationPreview[];
      totalCostNet: number;
      totalCostGross: number;
      primaryCurrency: string; // Use the most common currency or first encountered
    }
  >();

  // Process report previews and group by contractor
  for (const reportPreview of reportPreviews) {
    if (!groupedByContractor.has(reportPreview.contractorId)) {
      groupedByContractor.set(reportPreview.contractorId, {
        contractorId: reportPreview.contractorId,
        reports: [],
        totalCostNet: 0,
        totalCostGross: 0,
        primaryCurrency: reportPreview.currency, // Use first currency as primary
      });
    }

    const group = groupedByContractor.get(reportPreview.contractorId)!;
    group.reports.push(reportPreview);
    // Sum up cost amounts (netValue is the cost amount for the report)
    group.totalCostNet += reportPreview.netValue;
    group.totalCostGross += reportPreview.netValue; // For now, gross = net
  }

  const previews: CostReconciliationPreview[] = [];

  // Calculate cost reconciliation for each contractor
  for (const [, group] of groupedByContractor) {
    const netValue = Math.round(group.totalCostNet * 100) / 100;
    const grossValue = Math.round(group.totalCostGross * 100) / 100;

    // Find existing cost for this contractor and period
    // Match by contractor and period overlap (no currency requirement for matching)
    const existingCost = existingCosts.find((c) => {
      // Check contractor match
      const matchesContractor =
        c.contractor?.id === group.contractorId || c.contractor === null;
      // Check period overlap (invoice date within iteration period)
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

    // Generate invoice number if creating new
    const invoiceNumber: string | null = existingCost
      ? maybe.mapOrNull(existingCost.invoiceNumber, (inv) => inv)
      : `COST-${iteration.periodStart.year}-${String(iteration.periodStart.month).padStart(2, "0")}-${group.contractorId}`;

    const baseCostFields = {
      contractorId: group.contractorId,
      netValue,
      grossValue,
      currency: group.primaryCurrency, // Use primary currency (first encountered)
      invoiceNumber,
      counterparty: null, // Can be filled in later
      invoiceDate: iteration.periodStart, // Use period start as invoice date
      description: `Generated from report #${report.id}`,
    };

    if (existingCost) {
      // Update existing cost
      previews.push({
        ...baseCostFields,
        type: "update",
        id: existingCost.id,
        payload: {
          netValue,
          grossValue,
          currency: group.primaryCurrency,
        },
        oldValues: {
          netValue: existingCost.netValue,
          grossValue: existingCost.grossValue ?? null,
          currency: existingCost.currency,
        },
      });
    } else {
      // Create new cost
      previews.push({
        ...baseCostFields,
        type: "create",
        payload: {
          ...baseCostFields,
          contractorId: group.contractorId
            ? maybe.of(group.contractorId)
            : maybe.ofAbsent(),
          invoiceNumber: invoiceNumber,
          counterparty: null,
          description: `Generated from report #${report.id}`,
          workspaceId: 0, // Will be filled in during execution
        },
      });
    }
  }

  return previews;
}

function calculateReportBillingLinks(
  reportPreviews: ReportReconciliationPreview[],
  billingPreviews: BillingReconciliationPreview[],
  workspaceId: number,
): ReportBillingLinkPreview[] {
  const links: ReportBillingLinkPreview[] = [];

  // Goal: Link all reports from one workspace to the same billing
  // For each billing preview (which is per workspace + currency), link all matching reports
  for (const billingPreview of billingPreviews) {
    // Find all reports that match this billing's workspace and currency
    // Since all reports are from the same workspace in reconciliation, we match by currency
    const matchingReports = reportPreviews.filter(
      (r) => r.billingCurrency === billingPreview.currency,
    );

    // Link all matching reports to this billing
    for (const reportPreview of matchingReports) {
      // Calculate billing unit price from report's billing unit price
      const billingUnitPrice = reportPreview.billingUnitPrice;

      // Calculate the billing amount for this specific report
      const reportBillingAmount = reportPreview.quantity * billingUnitPrice;

      links.push({
        type: "create",
        reportId: reportPreview.type === "update" ? reportPreview.id : 0,
        billingId: billingPreview.type === "update" ? billingPreview.id : 0,
        reportAmount: reportPreview.netValue,
        billingAmount: reportBillingAmount,
        description: `Link between report and billing for workspace ${workspaceId}`,
        breakdown: {
          quantity: reportPreview.quantity,
          unit: reportPreview.unit,
          reportUnitPrice: reportPreview.unitPrice,
          billingUnitPrice: billingUnitPrice,
          reportCurrency: reportPreview.currency,
          billingCurrency: billingPreview.currency,
        },
        payload: {
          linkType: "reconcile",
          billingId: billingPreview.type === "update" ? billingPreview.id : 0,
          reportId: reportPreview.type === "update" ? reportPreview.id : 0,
          reportAmount: reportPreview.netValue,
          billingAmount: reportBillingAmount,
          description: `Link between report and billing for workspace ${workspaceId}`,
          breakdown: {
            quantity: reportPreview.quantity,
            unit: reportPreview.unit,
            reportUnitPrice: reportPreview.unitPrice,
            billingUnitPrice: billingUnitPrice,
            reportCurrency: reportPreview.currency,
            billingCurrency: billingPreview.currency,
          },
        },
      });
    }
  }

  return links;
}

function calculateReportCostLinks(
  reportPreviews: ReportReconciliationPreview[],
  costPreviews: CostReconciliationPreview[],
): ReportCostLinkPreview[] {
  const links: ReportCostLinkPreview[] = [];

  // Goal: Link all reports from a contractor to that contractor's cost
  // For each cost preview (which is per contractor), link all reports from that contractor
  for (const costPreview of costPreviews) {
    if (costPreview.contractorId === null) {
      continue; // Skip costs without contractor
    }

    // Find all reports for the same contractor
    const matchingReports = reportPreviews.filter(
      (r) => r.contractorId === costPreview.contractorId,
    );

    // Link all reports from this contractor to the contractor's cost
    for (const reportPreview of matchingReports) {
      // Calculate exchange rate if currencies differ
      const exchangeRate =
        reportPreview.currency === costPreview.currency ? 1 : 1; // TODO: Fetch actual exchange rate

      // Calculate cost amount for this specific report
      // The cost is the sum of all reports, so we use the report's netValue as the cost amount for this link
      const reportCostAmount = reportPreview.netValue;

      // Calculate cost unit price from report's unit price (since cost is per report)
      const costUnitPrice = reportPreview.unitPrice;

      links.push({
        type: "create",
        reportId: reportPreview.type === "update" ? reportPreview.id : 0,
        costId: costPreview.type === "update" ? costPreview.id : 0,
        reportAmount: reportPreview.netValue,
        costAmount: reportCostAmount, // Cost amount for this specific report
        description: `Link between report and cost for contractor ${reportPreview.contractorId}`,
        breakdown: {
          quantity: reportPreview.quantity,
          unit: reportPreview.unit,
          reportUnitPrice: reportPreview.unitPrice,
          costUnitPrice: costUnitPrice,
          exchangeRate: exchangeRate,
          reportCurrency: reportPreview.currency,
          costCurrency: costPreview.currency,
        },
        payload: {
          costId: costPreview.type === "update" ? costPreview.id : null,
          reportId: reportPreview.type === "update" ? reportPreview.id : null,
          costAmount: reportCostAmount,
          reportAmount: reportPreview.netValue,
          description: `Link between report and cost for contractor ${reportPreview.contractorId}`,
          breakdown: {
            quantity: reportPreview.quantity,
            unit: reportPreview.unit,
            reportUnitPrice: reportPreview.unitPrice,
            costUnitPrice: costUnitPrice,
            exchangeRate: exchangeRate,
            reportCurrency: reportPreview.currency,
            costCurrency: costPreview.currency,
          },
        },
      });
    }
  }

  return links;
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
    const reportPreviews = calculateReportReconciliation(
      input.report,
      input.iteration,
      existingReports,
    );

    // Reconciliation rules: Only consider existing reports (99.9% are existing because we generated reports out of them)
    // Filter out new reports (type === "create") - only work with existing reports
    const existingReportPreviews = reportPreviews.filter(
      (rp): rp is ReportToUpdate => rp.type === "update",
    );

    // Get workspaceId from project
    const workspaceId =
      input.project.workspaceIds.length > 0
        ? input.project.workspaceIds[0]
        : null;

    if (!workspaceId) {
      // Return empty reconciliation if no workspace
      return {
        reports: existingReportPreviews,
        billings: [],
        costs: [],
        reportBillingLinks: [],
        reportCostLinks: [],
      };
    }

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

    // 2. Find cost-report links that are pointing to reports that are subject of the process
    //    (This is already handled by filtering costs above - only costs with links to iteration reports are included)

    // 3. Find billings that are linked to reports
    //    (billings that have at least one link to any report)
    const linkedBillings = input.billings.filter(
      (billing) =>
        billing.linkBillingReport && billing.linkBillingReport.length > 0,
    );

    const billingPreviews = calculateBillingReconciliation(
      input.report,
      existingReportPreviews,
      linkedBillings,
      input.iteration,
      workspaceId,
    );

    const costPreviews = calculateCostReconciliation(
      input.report,
      existingReportPreviews,
      linkedCosts,
      input.iteration,
    );

    const reportBillingLinks = calculateReportBillingLinks(
      existingReportPreviews,
      billingPreviews,
      workspaceId,
    );

    const reportCostLinks = calculateReportCostLinks(
      existingReportPreviews,
      costPreviews,
    );

    return {
      reports: existingReportPreviews,
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
        }),
        ({ reportsView, billings, costs, iteration, project }) => ({
          report: params.report,
          reportsView,
          billings,
          costs,
          iteration,
          project: {
            clientId: project.clientId,
            workspaceIds: project.workspaceIds,
          },
        }),
      );

      return rd.map(reconciliationInput, (input) =>
        calculateReconciliationViewImpl(input),
      );
    },

    calculateReconciliationView: calculateReconciliationViewImpl,

    executeReconciliation: async (params: ExecuteReconciliationParams) => {
      const { preview, iteration, project, projectIterationId } = params;

      // Use the first workspace ID from the project
      const workspaceId =
        project.workspaceIds.length > 0 ? project.workspaceIds[0] : null;
      if (!workspaceId) {
        throw new Error("Project has no workspace assigned");
      }

      // Track created IDs for linking
      const reportIdMap = new Map<number, number>(); // oldId -> newId
      const billingIdMap = new Map<number, number>(); // oldId -> newId
      const costIdMap = new Map<number, number>(); // oldId -> newId

      // Reconcile Reports
      for (const reportPreview of preview.reports) {
        if (reportPreview.type === "create") {
          // Create new report
          const result = await config.services.mutationService.createReport({
            ...reportPreview.payload,
            periodStart: iteration.periodStart,
            periodEnd: iteration.periodEnd,
            clientId: project.clientId,
            workspaceId: workspaceId,
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
          // Create new billing
          const result = await config.services.mutationService.createBilling({
            ...billingPreview.payload,
            clientId: project.clientId,
            workspaceId: workspaceId,
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
          // Create new cost
          const result = await config.services.mutationService.createCost({
            ...costPreview.payload,
            workspaceId: workspaceId,
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
