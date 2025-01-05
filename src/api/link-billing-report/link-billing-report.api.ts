import { ClientBilling } from "@/api/client-billing/client-billing.api.ts";
import { ContractorReport } from "@/api/contractor-reports/contractor-reports.api.ts";
import { Contractor } from "@/api/contractor/contractor.api.ts";

export interface LinkBillingReport {
  id: number;
  createdAt: string;
  clientBillingId: number | null;
  contractorReportId: number | null;
  reconcileAmount: number;
  linkType: "clarify" | null;
  clarifyJustification: string | null;
  clientBilling: ClientBilling | null;
  contractor: Contractor | null;
  contractorReport: ContractorReport | null;
}
