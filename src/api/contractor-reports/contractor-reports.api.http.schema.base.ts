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
});
export type ContractorReportBase$ = z.input<typeof contractorReportBase$>;

export function contractorReportBaseFromHttp(
  contractorReport: ContractorReportBase$,
): ContractorReportBase {
  return {
    ...camelcaseKeys(contractorReport),
    description: contractorReport.description ?? "",
  };
}
