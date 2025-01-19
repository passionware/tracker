import { Billing, BillingPayload } from "@/api/billing/billing.api.ts";
import { Cost, CostPayload } from "@/api/cost/cost.api.ts";
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

export interface MutationApi {
  linkReportAndBilling: (payload: LinkReportBillingPayload) => Promise<void>;
  linkCostAndReport: (payload: LinkCostReportPayload) => Promise<void>;
  createReport: (report: CreateReportPayload) => Promise<{ id: Report["id"] }>;
  createBilling: (billing: BillingPayload) => Promise<{ id: Billing["id"] }>;
  createCost: (cost: CostPayload) => Promise<{ id: Cost["id"] }>;
  deleteBillingReportLink: (linkId: number) => Promise<void>;
  deleteCostReportLink: (linkId: number) => Promise<void>;
  deleteCostReport: (reportId: number) => Promise<void>;
  deleteBilling: (billingId: number) => Promise<void>;
  deleteCost: (costId: number) => Promise<void>;
  editCost: (costId: number, payload: Partial<CostPayload>) => Promise<void>;
  editBilling: (
    billingId: number,
    payload: Partial<BillingPayload>,
  ) => Promise<void>;
  editReport: (
    reportId: number,
    payload: Partial<CreateReportPayload>,
  ) => Promise<void>;
}
