import camelcaseKeys from "camelcase-keys";
import { z } from "zod";
import { LinkCostReportBase } from "./link-cost-report.ts";

export const linkCostReportBase$ = z.object({
  id: z.number(),
  created_at: z.coerce.date(),
  cost_amount: z.number(),
  report_amount: z.number(),
  description: z.string().nullable(),
  cost_id: z.number().nullable(),
  contractor_report_id: z.number().nullable(),
});
export type LinkCostReportBase$ = z.input<typeof linkCostReportBase$>;

export function linkCostReportBaseFromHttp(
  linkCostReport: LinkCostReportBase$,
): LinkCostReportBase {
  return {
    ...camelcaseKeys(linkCostReport),
    description: linkCostReport.description ?? "",
  };
}
