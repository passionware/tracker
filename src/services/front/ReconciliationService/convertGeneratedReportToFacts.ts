import { GeneratedReportSource } from "@/api/generated-report-source/generated-report-source.api.ts";
import { ProjectIteration } from "@/api/project-iteration/project-iteration.api.ts";
import { Project } from "@/api/project/project.api.ts";
import { getMatchingRate } from "@/services/io/_common/getMatchingRate.ts";
import { RoleRate } from "@/services/io/_common/GenericReport.ts";
import { v4 as uuidv4 } from "uuid";
import {
  Fact,
  ReportFact,
  CostFact,
  BillingFact,
  LinkCostReportFact,
  LinkBillingReportFact,
} from "./ReconciliationService.types";

// Re-export the utility for convenience
export {
  determineContractorWorkspace,
  determineContractorWorkspaces,
} from "./determineContractorWorkspace.ts";

/**
 * Formats a CalendarDate to a readable string (YYYY-MM-DD)
 */
function formatDate(date: { year: number; month: number; day: number }): string {
  return `${date.year}-${String(date.month).padStart(2, "0")}-${String(date.day).padStart(2, "0")}`;
}

/**
 * Formats a date range
 */
function formatDateRange(
  start: { year: number; month: number; day: number },
  end: { year: number; month: number; day: number },
): string {
  return `${formatDate(start)} to ${formatDate(end)}`;
}

/**
 * Formats a number with currency symbol
 */
function formatCurrency(amount: number, currency: string): string {
  return `${amount.toFixed(2)} ${currency}`;
}

/**
 * Formats a rate with currency
 */
function formatRate(rate: number, currency: string): string {
  return `${rate.toFixed(2)} ${currency}/h`;
}

/**
 * Creates a unique signature for a rate to identify it uniquely
 */
function getRateSignature(rate: RoleRate): string {
  const activityTypes = [...rate.activityTypes].sort().join(",");
  const taskTypes = [...rate.taskTypes].sort().join(",");
  const projectIds = [...rate.projectIds].sort().join(",");
  return `${rate.costRate}-${rate.costCurrency}-${activityTypes}-${taskTypes}-${projectIds}`;
}

/**
 * Creates a unique key for grouping entries by contractor and rate
 */
function getContractorRateKey(contractorId: number, rate: RoleRate): string {
  return `${contractorId}-${getRateSignature(rate)}`;
}

/**
 * Creates a descriptive report description
 */
function createReportDescription(
  projectName: string,
  dateRange: string,
  hours: number,
  internalRate: number,
  internalCurrency: string,
  externalRate: number,
  externalCurrency: string,
  reportValue: number,
  billingValue: number,
): string {
  return [
    `Project: ${projectName}`,
    `Period: ${dateRange}`,
    `Hours: ${hours.toFixed(2)}h`,
    `Internal Rate: ${formatRate(internalRate, internalCurrency)}`,
    `External Rate: ${formatRate(externalRate, externalCurrency)}`,
    ``,
    `Report Value (Internal): ${formatCurrency(reportValue, internalCurrency)}`,
    `Billing Value (External): ${formatCurrency(billingValue, externalCurrency)}`,
  ].join("\n");
}

/**
 * Creates a descriptive billing description with all linked reports
 */
function createBillingDescription(
  projectName: string,
  reports: Array<{
    contractorId: number;
    contractorName: string;
    hours: number;
    billingRate: number;
    billingAmount: number;
  }>,
  total: number,
  currency: string,
): string {
  const reportLines = reports.map((report, index) => {
    return [
      `  ${index + 1}. ${report.contractorName}`,
      `     Hours: ${report.hours.toFixed(2)}h`,
      `     Rate: ${formatRate(report.billingRate, currency)}`,
      `     Amount: ${formatCurrency(report.billingAmount, currency)}`,
    ].join("\n");
  });

  return [
    `Project: ${projectName}`,
    ``,
    `Linked Reports:`,
    ...reportLines,
    ``,
    `Total: ${formatCurrency(total, currency)}`,
  ].join("\n");
}

/**
 * Creates a descriptive cost description
 */
function createCostDescription(
  projectName: string,
  contractorName: string,
  hours: number,
  internalRate: number,
  currency: string,
  costValue: number,
): string {
  return [
    `Project: ${projectName}`,
    `Contractor: ${contractorName}`,
    `Hours: ${hours.toFixed(2)}h`,
    `Internal Rate: ${formatRate(internalRate, currency)}`,
    `Cost Value: ${formatCurrency(costValue, currency)}`,
  ].join("\n");
}

/**
 * Converts a generated report to an array of facts that should exist in the system.
 * This function describes what should be in the system without checking if items already exist.
 *
 * @param generatedReport - The generated report source (can be created from external sources like TMetric
 *                          even when no Reports exist in the system yet)
 * @param projectIteration - The project iteration containing period and project info
 * @param project - The project containing workspaceIds and clientId
 * @param contractorWorkspaceMap - Map of contractorId to workspaceId for determining which workspace each contractor belongs to.
 *                                  Use `determineContractorWorkspaces()` utility to build this map, which determines workspace by:
 *                                  1. Checking existing reports (if reportService is provided)
 *                                  2. Checking rate variables for each workspace (if expressionService is provided)
 *                                  3. Falling back to the first workspace in project.workspaceIds
 *                                  Contractors don't have a direct workspace property - they can work in different workspaces for different projects/clients.
 * @param contractorNameMap - Map of contractorId to contractor name. Used for generating descriptive fact descriptions.
 * @param uuidFactory - Optional function to generate UUIDs. Defaults to uuidv4. Useful for testing with deterministic UUIDs.
 * @returns Array of facts describing what should be in the system
 */
export function convertGeneratedReportToFacts(
  generatedReport: GeneratedReportSource,
  projectIteration: ProjectIteration,
  project: Project,
  contractorWorkspaceMap: Map<number, number>,
  contractorNameMap: Map<number, string> = new Map(),
  uuidFactory: () => string = uuidv4,
): Fact[] {
  const facts: Fact[] = [];

  // Group time entries by contractor + rate
  const groupedByContractorRate = new Map<
    string,
    {
      contractorId: number;
      rate: RoleRate;
      entries: typeof generatedReport.data.timeEntries;
    }
  >();

  // Process each time entry and group by contractor + rate
  for (const entry of generatedReport.data.timeEntries) {
    try {
      const matchingRate = getMatchingRate(generatedReport.data, entry);
      const key = getContractorRateKey(entry.contractorId, matchingRate);

      if (!groupedByContractorRate.has(key)) {
        groupedByContractorRate.set(key, {
          contractorId: entry.contractorId,
          rate: matchingRate,
          entries: [],
        });
      }

      groupedByContractorRate.get(key)!.entries.push(entry);
    } catch (error) {
      // Skip entries without matching rates
      console.warn("Skipping entry without matching rate:", error);
    }
  }

  // Create report facts and cost facts for each contractor + rate group
  const reportFacts: Array<
    ReportFact & {
      billingAmount: number;
      billingCurrency: string;
      billingUnitPrice: number;
    }
  > = [];
  const costFacts: CostFact[] = [];

  for (const [, group] of groupedByContractorRate) {
    // Calculate total hours and cost for this group
    let totalHours = 0;
    let totalCost = 0;
    let totalBilling = 0;

    for (const entry of group.entries) {
      const hours =
        (entry.endAt.getTime() - entry.startAt.getTime()) / (1000 * 60 * 60);
      totalHours += hours;
      totalCost += hours * group.rate.costRate;
      totalBilling += hours * group.rate.billingRate;
    }

    const netValue = Math.round(totalCost * 100) / 100;
    const quantity = Math.round(totalHours * 100) / 100;
    const unitPrice = Math.round(group.rate.costRate * 100) / 100;
    const billingUnitPrice = Math.round(group.rate.billingRate * 100) / 100;
    const billingAmount = Math.round(totalBilling * 100) / 100;

    // Get contractor workspace (fallback to first project workspace if not found)
    const contractorWorkspaceId =
      contractorWorkspaceMap.get(group.contractorId) ??
      project.workspaceIds[0] ??
      0;

    // Create ReportFact
    const reportUuid = uuidFactory();
    const dateRange = formatDateRange(
      projectIteration.periodStart,
      projectIteration.periodEnd,
    );
    const reportDescription = createReportDescription(
      project.name,
      dateRange,
      quantity,
      unitPrice,
      group.rate.costCurrency,
      billingUnitPrice,
      group.rate.billingCurrency,
      netValue,
      billingAmount,
    );
    const reportFact: ReportFact & {
      billingAmount: number;
      billingCurrency: string;
      billingUnitPrice: number;
    } = {
      uuid: reportUuid,
      type: "report",
      payload: {
        contractorId: group.contractorId,
        periodStart: projectIteration.periodStart,
        periodEnd: projectIteration.periodEnd,
        clientId: project.clientId,
        workspaceId: contractorWorkspaceId,
        description: reportDescription,
        netValue,
        unit: "h",
        quantity,
        unitPrice,
        currency: group.rate.costCurrency,
        projectIterationId: generatedReport.projectIterationId,
      },
      billingAmount,
      billingCurrency: group.rate.billingCurrency,
      billingUnitPrice,
    };
    reportFacts.push(reportFact);
    facts.push(reportFact);

    // Create CostFact (linked to the report)
    const costUuid = uuidFactory();
    const contractorName =
      contractorNameMap.get(group.contractorId) ?? `Contractor #${group.contractorId}`;
    const costDescription = createCostDescription(
      project.name,
      contractorName,
      quantity,
      unitPrice,
      group.rate.costCurrency,
      netValue,
    );
    const costFact: CostFact = {
      uuid: costUuid,
      type: "cost",
      payload: {
        contractorId: group.contractorId,
        netValue,
        grossValue: netValue, // For now, gross = net
        currency: group.rate.costCurrency,
        invoiceNumber: `COST-${projectIteration.periodStart.year}-${String(projectIteration.periodStart.month).padStart(2, "0")}-${group.contractorId}`,
        counterparty: null,
        invoiceDate: projectIteration.periodStart,
        description: costDescription,
        workspaceId: contractorWorkspaceId,
      },
      constraints: {
        linkedToReport: reportUuid,
      },
    };
    costFacts.push(costFact);
    facts.push(costFact);

    // Create LinkCostReportFact
    const linkCostReportFact: LinkCostReportFact = {
      uuid: uuidFactory(),
      type: "linkCostReport",
      payload: {
        costId: null, // Will be resolved during reconciliation
        reportId: null, // Will be resolved during reconciliation
        costAmount: netValue,
        reportAmount: netValue,
        description: `Link between cost and report for contractor ${group.contractorId}`,
        breakdown: {
          quantity,
          unit: "h",
          reportUnitPrice: unitPrice,
          costUnitPrice: unitPrice,
          exchangeRate: 1, // Same currency, so exchange rate is 1
          reportCurrency: group.rate.costCurrency,
          costCurrency: group.rate.costCurrency,
        },
      },
    };
    facts.push(linkCostReportFact);
  }

  // Group reports by workspace and billing currency for billing facts
  const groupedByWorkspaceCurrency = new Map<
    string,
    {
      workspaceId: number;
      billingCurrency: string;
      reports: Array<
        ReportFact & {
          billingAmount: number;
          billingCurrency: string;
          billingUnitPrice: number;
        }
      >;
      totalBillingNet: number;
      totalBillingGross: number;
    }
  >();

  for (const reportFact of reportFacts) {
    const key = `${reportFact.payload.workspaceId}-${reportFact.billingCurrency}`;

    if (!groupedByWorkspaceCurrency.has(key)) {
      groupedByWorkspaceCurrency.set(key, {
        workspaceId: reportFact.payload.workspaceId,
        billingCurrency: reportFact.billingCurrency,
        reports: [],
        totalBillingNet: 0,
        totalBillingGross: 0,
      });
    }

    const workspaceGroup = groupedByWorkspaceCurrency.get(key)!;
    workspaceGroup.reports.push(reportFact);

    // Use the billing amount directly from the report fact
    workspaceGroup.totalBillingNet += reportFact.billingAmount;
    workspaceGroup.totalBillingGross += reportFact.billingAmount; // For now, gross = net
  }

  // Create billing facts (one per workspace + currency)
  for (const [, workspaceGroup] of groupedByWorkspaceCurrency) {
    const totalNet = Math.round(workspaceGroup.totalBillingNet * 100) / 100;
    const totalGross = Math.round(workspaceGroup.totalBillingGross * 100) / 100;

    const billingUuid = uuidFactory();
    const billingReports = workspaceGroup.reports.map((report) => ({
      contractorId: report.payload.contractorId,
      contractorName:
        contractorNameMap.get(report.payload.contractorId) ??
        `Contractor #${report.payload.contractorId}`,
      hours: report.payload.quantity ?? 0,
      billingRate: report.billingUnitPrice,
      billingAmount: report.billingAmount,
    }));
    const billingDescription = createBillingDescription(
      project.name,
      billingReports,
      totalNet,
      workspaceGroup.billingCurrency,
    );
    const billingFact: BillingFact = {
      uuid: billingUuid,
      type: "billing",
      payload: {
        currency: workspaceGroup.billingCurrency,
        totalNet,
        totalGross,
        clientId: project.clientId,
        invoiceNumber: `INV-${projectIteration.periodStart.year}-${String(projectIteration.periodStart.month).padStart(2, "0")}-WS${workspaceGroup.workspaceId}`,
        invoiceDate: projectIteration.periodStart,
        description: billingDescription,
        workspaceId: workspaceGroup.workspaceId,
      },
      constraints: {
        // Link to the first report as a hint (all reports in this group should be linked)
        linkedToReport: workspaceGroup.reports[0]?.uuid ?? "",
      },
    };
    facts.push(billingFact);

    // Create LinkBillingReportFact for each report in this workspace group
    for (const reportFact of workspaceGroup.reports) {
      const quantity = reportFact.payload.quantity ?? 0;
      const reportUnitPrice = reportFact.payload.unitPrice ?? 0;
      const reportAmount = reportFact.payload.netValue;
      const billingAmount = reportFact.billingAmount;

      const linkBillingReportFact: LinkBillingReportFact = {
        uuid: uuidFactory(),
        type: "linkBillingReport",
        payload: {
          linkType: "reconcile",
          billingId: 0, // Will be resolved during reconciliation
          reportId: 0, // Will be resolved during reconciliation
          reportAmount,
          billingAmount,
          description: `Link between billing and report for contractor ${reportFact.payload.contractorId}`,
          breakdown: {
            quantity,
            unit: reportFact.payload.unit ?? "h",
            reportUnitPrice,
            billingUnitPrice: reportFact.billingUnitPrice,
            reportCurrency: reportFact.payload.currency,
            billingCurrency: workspaceGroup.billingCurrency,
          },
        },
      };
      facts.push(linkBillingReportFact);
    }
  }

  return facts;
}
