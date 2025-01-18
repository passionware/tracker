import camelcaseKeys from "camelcase-keys";
import { z } from "zod";
import { LinkCostReport } from "./link-cost-report.ts";

export const linkCostReport$ = z.object({
  id: z.number(),
  created_at: z.coerce.date(),
  cost_amount: z.number(),
  report_amount: z.number(),
  description: z.string().nullable(),
  cost_id: z.number().nullable(),
  report_id: z.number().nullable(),
});
export type LinkCostReport$ = z.input<typeof linkCostReport$>;

export function linkCostReportFromHttp(
  linkCostReport: LinkCostReport$,
): LinkCostReport {
  return {
    ...camelcaseKeys(linkCostReport),
    description: linkCostReport.description ?? "",
  };
}
