import { Billing, BillingPayload } from "@/api/billing/billing.api.ts";
import { Cost, CostPayload } from "@/api/cost/cost.api.ts";
import { GeneratedReportSource } from "@/api/generated-report-source/generated-report-source.api.ts";
import {
  LinkBillingReport,
  LinkBillingReportPayload,
} from "@/api/link-billing-report/link-billing-report.api.ts";
import {
  LinkCostReport,
  LinkCostReportPayload,
} from "@/api/link-cost-report/link-cost-report.ts";
import { Project } from "@/api/project/project.api.ts";
import { ProjectIteration } from "@/api/project-iteration/project-iteration.api.ts";
import { Report, ReportPayload } from "@/api/reports/reports.api.ts";
import { ReportView } from "@/services/front/ReportDisplayService/ReportDisplayService.ts";
import {
  ClientSpec,
  WorkspaceSpec,
} from "@/services/front/RoutingService/RoutingService.ts";
import { CalendarDate } from "@internationalized/date";
import { RemoteData } from "@passionware/monads";

/**
 * Generic type for items that will be created during reconciliation
 */
export type ToCreate<Base, Payload> = Base & {
  type: "create";
  payload: Payload;
};

/**
 * Generic type for items that will be updated during reconciliation
 */
export type ToUpdate<Base, Payload, Id> = Base & {
  type: "update";
  id: Id;
  payload: Partial<Payload>;
  /**
   * Old values for fields that will be updated.
   * Contains the current values from the existing entity for fields present in payload.
   */
  oldValues: Partial<Payload>;
};

/**
 * Generic type for items that will be deleted during reconciliation
 */
export type ToDelete<Base, Id> = Base & {
  type: "delete";
  id: Id;
};

/**
 * Generic discriminated union for create/update/delete operations
 */
export type ReconciliationItem<Base, Payload, Id> =
  | ToCreate<Base, Payload>
  | ToUpdate<Base, Payload, Id>
  | ToDelete<Base, Id>;

/**
 * Common fields for report reconciliation preview (for display/debugging)
 */
interface ReportReconciliationPreviewBase {
  contractorId: number;
  netValue: number;
  unit: string;
  quantity: number;
  unitPrice: number; // cost unit price
  currency: string; // cost currency
  billingUnitPrice: number; // billing unit price
  billingCurrency: string; // billing currency
  rateSignature: string; // For display/debugging
}

/**
 * Report that will be created during reconciliation
 */
export type ReportToCreate = ToCreate<
  ReportReconciliationPreviewBase,
  Omit<
    ReportPayload,
    "contractorId" | "netValue" | "unit" | "quantity" | "unitPrice" | "currency"
  > & {
    contractorId: number;
    netValue: number;
    unit: string;
    quantity: number;
    unitPrice: number;
    currency: string;
  }
>;

/**
 * Report that will be updated during reconciliation
 */
export type ReportToUpdate = ToUpdate<
  ReportReconciliationPreviewBase,
  ReportPayload,
  Report["id"]
>;

/**
 * Discriminated union for report reconciliation preview
 */
export type ReportReconciliationPreview = ReportToCreate | ReportToUpdate;

/**
 * Common fields for billing reconciliation preview
 */
interface BillingReconciliationPreviewBase {
  workspaceId: number;
  totalNet: number;
  totalGross: number;
  currency: string;
  invoiceNumber: string;
  invoiceDate: CalendarDate;
  description: string | null;
}

/**
 * Billing that will be created during reconciliation
 */
export type BillingToCreate = ToCreate<
  BillingReconciliationPreviewBase,
  BillingPayload
>;

/**
 * Billing that will be updated during reconciliation
 */
export type BillingToUpdate = ToUpdate<
  BillingReconciliationPreviewBase,
  BillingPayload,
  Billing["id"]
>;

/**
 * Discriminated union for billing reconciliation preview
 */
export type BillingReconciliationPreview = BillingToCreate | BillingToUpdate;

/**
 * Common fields for cost reconciliation preview
 */
interface CostReconciliationPreviewBase {
  contractorId: number | null;
  netValue: number;
  grossValue: number | null;
  currency: string;
  invoiceNumber: string | null;
  counterparty: string | null;
  invoiceDate: CalendarDate;
  description: string | null;
}

/**
 * Cost that will be created during reconciliation
 */
export type CostToCreate = ToCreate<CostReconciliationPreviewBase, CostPayload>;

/**
 * Cost that will be updated during reconciliation
 */
export type CostToUpdate = ToUpdate<
  CostReconciliationPreviewBase,
  CostPayload,
  Cost["id"]
>;

/**
 * Discriminated union for cost reconciliation preview
 */
export type CostReconciliationPreview = CostToCreate | CostToUpdate;

/**
 * Helper functions to extract IDs from discriminated unions
 */
export function getReportId(preview: ReportReconciliationPreview): number {
  return preview.type === "update" ? preview.id : 0;
}

export function getBillingId(preview: BillingReconciliationPreview): number {
  return preview.type === "update" ? preview.id : 0;
}

export function getCostId(preview: CostReconciliationPreview): number {
  return preview.type === "update" ? preview.id : 0;
}

export function getReportBillingLinkId(
  preview: ReportBillingLinkPreview,
): number {
  return preview.type === "update" ? preview.id : 0;
}

export function getReportCostLinkId(preview: ReportCostLinkPreview): number {
  return preview.type === "update" ? preview.id : 0;
}

/**
 * Common fields for report-billing link preview
 */
interface ReportBillingLinkPreviewBase {
  reportId: Report["id"]; // Will be resolved to actual ID during execution
  billingId: Billing["id"]; // Will be resolved to actual ID during execution
  reportAmount: number;
  billingAmount: number;
  description: string;
  breakdown: {
    quantity: number;
    unit: string;
    reportUnitPrice: number;
    billingUnitPrice: number;
    reportCurrency: string;
    billingCurrency: string;
  };
}

/**
 * Report-Billing link that will be created during reconciliation
 */
export type ReportBillingLinkToCreate = ToCreate<
  ReportBillingLinkPreviewBase,
  Omit<
    LinkBillingReportPayload,
    | "linkType"
    | "billingId"
    | "reportId"
    | "reportAmount"
    | "billingAmount"
    | "description"
    | "breakdown"
  > & {
    linkType: "reconcile";
    billingId: number;
    reportId: number;
    reportAmount: number;
    billingAmount: number;
    description: string;
    breakdown: {
      quantity: number;
      unit: string;
      reportUnitPrice: number;
      billingUnitPrice: number;
      reportCurrency: string;
      billingCurrency: string;
    };
  }
>;

/**
 * Report-Billing link that will be updated during reconciliation
 */
export type ReportBillingLinkToUpdate = ToUpdate<
  ReportBillingLinkPreviewBase,
  LinkBillingReportPayload,
  LinkBillingReport["id"]
>;

/**
 * Discriminated union for report-billing link preview
 */
export type ReportBillingLinkPreview =
  | ReportBillingLinkToCreate
  | ReportBillingLinkToUpdate;

/**
 * Common fields for report-cost link preview
 */
interface ReportCostLinkPreviewBase {
  reportId: Report["id"]; // Will be resolved to actual ID during execution
  costId: Cost["id"]; // Will be resolved to actual ID during execution
  reportAmount: number;
  costAmount: number;
  description: string;
  breakdown: {
    quantity: number;
    unit: string;
    reportUnitPrice: number;
    costUnitPrice: number;
    exchangeRate: number;
    reportCurrency: string;
    costCurrency: string;
  };
}

/**
 * Report-Cost link that will be created during reconciliation
 */
export type ReportCostLinkToCreate = ToCreate<
  ReportCostLinkPreviewBase,
  Omit<
    LinkCostReportPayload,
    | "costId"
    | "reportId"
    | "costAmount"
    | "reportAmount"
    | "description"
    | "breakdown"
  > & {
    costId: number | null;
    reportId: number | null;
    costAmount: number;
    reportAmount: number;
    description: string;
    breakdown: {
      quantity: number;
      unit: string;
      reportUnitPrice: number;
      costUnitPrice: number;
      exchangeRate: number;
      reportCurrency: string;
      costCurrency: string;
    };
  }
>;

/**
 * Report-Cost link that will be updated during reconciliation
 */
export type ReportCostLinkToUpdate = ToUpdate<
  ReportCostLinkPreviewBase,
  LinkCostReportPayload,
  LinkCostReport["id"]
>;

/**
 * Discriminated union for report-cost link preview
 */
export type ReportCostLinkPreview =
  | ReportCostLinkToCreate
  | ReportCostLinkToUpdate;

/**
 * Complete reconciliation preview containing all entities and links
 */
export interface ReconciliationPreview {
  reports: ReportReconciliationPreview[];
  billings: BillingReconciliationPreview[];
  costs: CostReconciliationPreview[];
  reportBillingLinks: ReportBillingLinkPreview[];
  reportCostLinks: ReportCostLinkPreview[];
}

/**
 * Input data required for reconciliation calculation
 */
export interface ReconciliationInput {
  report: GeneratedReportSource;
  reportsView: ReportView;
  billings: Billing[];
  costs: Cost[];
  iteration: ProjectIteration;
  project: Project;
  contractorWorkspaceMap: Map<number, number>;
  contractorNameMap: Map<number, string>;
}

/**
 * Parameters for executing reconciliation
 */
export interface ExecuteReconciliationParams {
  preview: ReconciliationPreview;
  report: GeneratedReportSource;
  iteration: ProjectIteration;
  project: {
    clientId: number;
    workspaceIds: number[];
  };
  projectIterationId: ProjectIteration["id"];
}

/**
 * Parameters for useReconciliationView hook
 */
export interface UseReconciliationViewParams {
  report: GeneratedReportSource;
  iteration: RemoteData<ProjectIteration>;
  projectId: number;
  workspaceId: WorkspaceSpec;
  clientId: ClientSpec;
}

/**
 * Service for managing reconciliation operations
 */
export interface ReconciliationService {
  /**
   * Hook to get reconciliation view data
   * Handles query building, data fetching, and reconciliation calculation
   */
  useReconciliationView: (
    params: UseReconciliationViewParams,
  ) => RemoteData<ReconciliationPreview>;

  /**
   * Calculate and return reconciliation preview based on generated report and existing data
   * Combines all data sources and applies reconciliation rules:
   * - Only considers existing reports (reportId > 0)
   * - Only considers costs linked to reports in the iteration
   * - Only considers billings linked to reports
   */
  calculateReconciliationView: (
    input: ReconciliationInput,
  ) => ReconciliationPreview;

  /**
   * Execute reconciliation by creating/updating reports, billings, costs, and their links
   * @param params Reconciliation parameters
   */
  executeReconciliation: (params: ExecuteReconciliationParams) => Promise<void>;
}

export interface WithReconciliationService {
  reconciliationService: ReconciliationService;
}
