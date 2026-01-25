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
  // Breakdown fields
  d_quantity: z.number().nullable(),
  d_unit: z.string().nullable(),
  d_report_unit_price: z.number().nullable(),
  d_cost_unit_price: z.number().nullable(),
  d_exchange_rate: z.number().nullable(),
  d_report_currency: z.string().nullable(),
  d_cost_currency: z.string().nullable(),
});
export type LinkCostReport$ = z.input<typeof linkCostReport$>;

export function linkCostReportFromHttp(
  linkCostReport: LinkCostReport$,
): LinkCostReport {
  // Helper to create breakdown object if fields are present
  const createBreakdown = () => {
    if (
      linkCostReport.d_quantity !== null &&
      linkCostReport.d_unit !== null &&
      linkCostReport.d_report_unit_price !== null &&
      linkCostReport.d_cost_unit_price !== null &&
      linkCostReport.d_exchange_rate !== null &&
      linkCostReport.d_report_currency !== null &&
      linkCostReport.d_cost_currency !== null
    ) {
      return {
        quantity: linkCostReport.d_quantity,
        unit: linkCostReport.d_unit,
        reportUnitPrice: linkCostReport.d_report_unit_price,
        costUnitPrice: linkCostReport.d_cost_unit_price,
        exchangeRate: linkCostReport.d_exchange_rate,
        reportCurrency: linkCostReport.d_report_currency,
        costCurrency: linkCostReport.d_cost_currency,
      };
    }
    return undefined;
  };

  return {
    id: linkCostReport.id,
    createdAt: linkCostReport.created_at,
    costAmount: linkCostReport.cost_amount,
    reportAmount: linkCostReport.report_amount,
    description: linkCostReport.description ?? "",
    costId: linkCostReport.cost_id,
    reportId: linkCostReport.report_id,
    breakdown: createBreakdown(),
  };
}
