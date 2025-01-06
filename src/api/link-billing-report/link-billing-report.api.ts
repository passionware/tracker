import { ClientBilling } from "@/api/client-billing/client-billing.api.ts";
import { ContractorReport } from "@/api/contractor-reports/contractor-reports.api.ts";

export type LinkBillingReport = {
  id: number;
  createdAt: string;
} & (
  | {
      linkType: "reconcile";
      clientBillingId: number;
      contractorReportId: number;
      linkAmount: number;
      // references to the linked entities
      contractorReport: ContractorReport | null;
      clientBilling: ClientBilling | null;
    }
  | {
      linkType: "clarify";
      contractorReportId: number;
      clarifyJustification: string;
      linkAmount: number;
      // references to the linked entities
      contractorReport: ContractorReport | null;
    }
);
