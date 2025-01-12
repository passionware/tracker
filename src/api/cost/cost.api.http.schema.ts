import {
  ContractorReport$,
  contractorReport$,
  contractorReportFromHttp,
} from "@/api/contractor-reports/contractor-reports.api.http.schema.ts";
import {
  contractor$,
  contractorFromHttp,
} from "@/api/contractor/contractor.api.http.schema.ts";
import { Cost } from "@/api/cost/cost.api.ts";
import {
  LinkCostReport$,
  linkCostReport$,
  linkCostReportFromHttp,
} from "@/api/link-cost-report/link-cost-report.http.schema.ts";
import { maybe } from "@passionware/monads";
import camelcaseKeys from "camelcase-keys";
import { z } from "zod";

export const costBase$ = z.object({
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
  contractor: contractor$.optional().nullable(),
  workspace_id: z.number(),
});

export type Cost$ = z.input<typeof costBase$> & {
  contractor_reports?: {
    link_cost_report: LinkCostReport$;
    contractor_report: ContractorReport$;
  }[];
};

export const cost$: z.ZodType<Cost$> = costBase$.extend({
  contractor_reports: z.lazy(() =>
    z
      .array(
        z.object({
          link_cost_report: linkCostReport$,
          contractor_report: contractorReport$,
        }),
      )
      .optional(),
  ),
});

export function costFromHttp(cost: Cost$): Cost {
  return {
    ...camelcaseKeys(cost),
    contractor: maybe.mapOrNull(cost.contractor, contractorFromHttp),
    linkReports: maybe.mapOrNull(cost.contractor_reports, (reports) =>
      reports.map((report) => ({
        ...linkCostReportFromHttp(report.link_cost_report),
        contractorReport: contractorReportFromHttp(report.contractor_report),
      })),
    ),
  };
}
