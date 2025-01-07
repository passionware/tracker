import {
  contractor$,
  contractorFromHttp,
} from "@/api/contractor/contractor.api.http.schema.ts";
import { Cost } from "@/api/cost/cost.api.ts";
import {
  linkCostReport$,
  linkCostReportFromHttp,
} from "@/api/link-cost-report/link-cost-report.http.schema.ts";
import { maybe } from "@passionware/monads";
import camelcaseKeys from "camelcase-keys";
import { z } from "zod";

export const cost$ = z.object({
  id: z.number(),
  created_at: z.coerce.date(),
  invoice_number: z.string().nullable(),
  counterparty: z.string().nullable(),
  description: z.string().nullable(),
  invoice_date: z.coerce.date(),
  net_value: z.number(),
  gross_value: z.number().nullable(),
  contractor_id: z.number().nullable(),
  currency: z.string(),
  // foreign references
  contractors: contractor$.optional(),
  link_cost_report: z.array(linkCostReport$).optional(),
});

export type Cost$ = z.input<typeof cost$>;

export function costFromHttp(cost: Cost$): Cost {
  return {
    ...camelcaseKeys(cost),
    contractor: maybe.mapOrNull(cost.contractors, contractorFromHttp),
    linkCostReports: maybe.mapOrNull(cost.link_cost_report, (linkCostReport) =>
      linkCostReport.map(linkCostReportFromHttp),
    ),
  };
}
