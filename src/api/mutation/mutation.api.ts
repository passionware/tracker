import { ClientBilling } from "@/api/client-billing/client-billing.api.ts";
import { ContractorReport } from "@/api/contractor-reports/contractor-reports.api.ts";

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

export type LinkCostReportPayload = {
  costId: number;
  contractorReportId: number;
  costAmount: number;
  reportAmount: number;
  description: string;
};

export type CreateContractorReportPayload = Omit<
  ContractorReport,
  "id" | "createdAt" | "linkBillingReport" | "contractor"
>;

export type CreateClientBillingPayload = Omit<
  ClientBilling,
  "client" | "linkBillingReport" | "createdAt" | "id"
>;

export interface MutationApi {
  linkReportAndBilling: (payload: LinkReportBillingPayload) => Promise<void>;
  linkCostAndReport: (payload: LinkCostReportPayload) => Promise<void>;
  createContractorReport: (
    report: CreateContractorReportPayload,
  ) => Promise<{ id: ContractorReport["id"] }>;
  createClientBilling: (
    billing: CreateClientBillingPayload,
  ) => Promise<{ id: ClientBilling["id"] }>;
  deleteBillingReportLink: (linkId: number) => Promise<void>;
  deleteCostReportLink: (linkId: number) => Promise<void>;
}
