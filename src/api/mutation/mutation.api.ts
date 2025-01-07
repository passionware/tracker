import { ContractorReport } from "@/api/contractor-reports/contractor-reports.api.ts";

export type LinkPayload =
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

export type CreateContractorReportPayload = Omit<
  ContractorReport,
  "id" | "createdAt" | "linkBillingReport" | "contractor"
>;

export interface MutationApi {
  linkReportAndBilling: (payload: LinkPayload) => Promise<void>;
  createContractorReport: (
    report: CreateContractorReportPayload,
  ) => Promise<{ id: ContractorReport["id"] }>;
  deleteBillingReportLink: (linkId: number) => Promise<void>;
}
