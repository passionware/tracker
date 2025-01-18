import {
  ClientBilling,
  ClientBillingBase,
} from "@/api/client-billing/client-billing.api.ts";
import {
  ContractorReport,
  ContractorReportBase,
} from "@/api/contractor-reports/contractor-reports.api.ts";
import { Cost, CostBase } from "@/api/cost/cost.api.ts";

export type LinkReportBillingPayload =
  | ({
      type: "clarify";
      clarifyJustification: string;
      linkAmount: number;
    } & (
      | {
          contractorReportId: number;
        }
      | {
          clientBillingId: number;
        }
    ))
  | {
      type: "reconcile";
      clientBillingId: number;
      contractorReportId: number;
      linkAmount: number;
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

export type CreateContractorReportPayload = Omit<
  ContractorReportBase,
  "id" | "createdAt" | "linkBillingReport" | "linkCostReport"
>;

export type CreateClientBillingPayload = Omit<
  ClientBillingBase,
  "createdAt" | "id"
>;

export type CreateCostPayload = Omit<CostBase, "createdAt" | "id">;

export interface MutationApi {
  linkReportAndBilling: (payload: LinkReportBillingPayload) => Promise<void>;
  linkCostAndReport: (payload: LinkCostReportPayload) => Promise<void>;
  createContractorReport: (
    report: CreateContractorReportPayload,
  ) => Promise<{ id: ContractorReport["id"] }>;
  createClientBilling: (
    billing: CreateClientBillingPayload,
  ) => Promise<{ id: ClientBilling["id"] }>;
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
  editClientBilling: (
    billingId: number,
    payload: Partial<CreateClientBillingPayload>,
  ) => Promise<void>;
  editReport: (
    reportId: number,
    payload: Partial<CreateContractorReportPayload>,
  ) => Promise<void>;
}
