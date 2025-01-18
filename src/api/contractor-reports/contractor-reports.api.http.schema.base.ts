import { ContractorReportBase } from "@/api/contractor-reports/contractor-reports.api.ts";
import camelcaseKeys from "camelcase-keys";
import { z } from "zod";

export const contractorReportBase$ = z.object({
  id: z.number(),
  created_at: z.string(),
  contractor_id: z.number(),
  description: z.string().default(""),
  net_value: z.number(),
  period_start: z.coerce.date(),
  period_end: z.coerce.date(),
  currency: z.string(),
  client_id: z.number(),
  workspace_id: z.number(),
  total_billing_billing_value: z.number(),
  total_cost_cost_value: z.number(),
  report_billing_balance: z.number(),
  report_cost_balance: z.number(),
  billing_cost_balance: z.number(),
});
export type ContractorReportBase$ = z.input<typeof contractorReportBase$>;

export function contractorReportBaseFromHttp(
  contractorReport: ContractorReportBase$,
): ContractorReportBase {
  return {
    ...camelcaseKeys(contractorReport),
    description: contractorReport.description ?? "",
    reportBillingValue: contractorReport.total_billing_billing_value,
    reportCostValue: contractorReport.total_cost_cost_value,
    reportCostBalance: contractorReport.report_cost_balance,
    reportBillingBalance: contractorReport.report_billing_balance,
    billingCostBalance: contractorReport.billing_cost_balance,
  };
}
