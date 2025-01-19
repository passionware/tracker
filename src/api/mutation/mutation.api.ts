import { Billing, BillingBase } from "@/api/billing/billing.api.ts";
import { Cost, CostBase } from "@/api/cost/cost.api.ts";
import { Report, ReportBase } from "@/api/reports/reports.api.ts";

export type LinkReportBillingPayload =
  | ({
      type: "clarify";
      description: string;
    } & (
      | {
          reportId: number;
          reportAmount: number;
        }
      | {
          billingId: number;
          billingAmount: number;
        }
    ))
  | {
      type: "reconcile";
      billingId: number;
      reportId: number;
      reportAmount: number;
      billingAmount: number;
      description: string;
    };

export type LinkCostReportPayload =
  | {
      type: "link";
      costId: number;
      reportId: number;
      costAmount: number;
      reportAmount: number;
      description: string;
    }
  | {
      type: "clarify-report";
      reportId: number;
      reportAmount: number;
      description: string;
    };

export type CreateReportPayload = Omit<
  ReportBase,
  "id" | "createdAt" | "linkBillingReport" | "linkCostReport"
>;

export type CreateBillingPayload = Omit<BillingBase, "createdAt" | "id">;

export type CreateCostPayload = Omit<CostBase, "createdAt" | "id">;

export interface MutationApi {
  linkReportAndBilling: (payload: LinkReportBillingPayload) => Promise<void>;
  linkCostAndReport: (payload: LinkCostReportPayload) => Promise<void>;
  createReport: (report: CreateReportPayload) => Promise<{ id: Report["id"] }>;
  createBilling: (
    billing: CreateBillingPayload,
  ) => Promise<{ id: Billing["id"] }>;
  createCost: (cost: CreateCostPayload) => Promise<{ id: Cost["id"] }>;
  deleteBillingReportLink: (linkId: number) => Promise<void>;
  deleteCostReportLink: (linkId: number) => Promise<void>;
  deleteCostReport: (reportId: number) => Promise<void>;
  deleteBilling: (billingId: number) => Promise<void>;
  deleteCost: (costId: number) => Promise<void>;
  editCost: (
    costId: number,
    payload: Partial<CreateCostPayload>,
  ) => Promise<void>;
  editBilling: (
    billingId: number,
    payload: Partial<CreateBillingPayload>,
  ) => Promise<void>;
  editReport: (
    reportId: number,
    payload: Partial<CreateReportPayload>,
  ) => Promise<void>;
}
