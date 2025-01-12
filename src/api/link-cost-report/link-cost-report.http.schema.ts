import {
  ContractorReport$,
  contractorReportFromHttp,
} from "@/api/contractor-reports/contractor-reports.api.http.schema.ts";
import { contractor$ } from "@/api/contractor/contractor.api.http.schema.ts";
import { Cost$, cost$, costFromHttp } from "@/api/cost/cost.api.http.schema.ts";
import { LinkCostReport } from "@/api/link-cost-report/link-cost-report.ts";
import { maybe } from "@passionware/monads";
import camelcaseKeys from "camelcase-keys";
import { z, ZodType } from "zod";

const linkCostReportBase$ = z.object({
  id: z.number(),
  created_at: z.coerce.date(),
  cost_amount: z.number(),
  report_amount: z.number(),
  description: z.string().nullable(),
  cost_id: z.number(),
  contractor_report_id: z.number(),
});

export type LinkCostReport$ = z.input<typeof linkCostReportBase$> & {
  cost?: Cost$ | null;
  contractor_reports?: ContractorReport$ | null;
};

export const linkCostReport$: ZodType<LinkCostReport$> =
  linkCostReportBase$.extend({
    costs: z.lazy(() => z.array(cost$).optional()),
    contractor: z.lazy(() => contractor$.optional()),
  });

export function linkCostReportFromHttp(
  linkCostReport: LinkCostReport$,
): LinkCostReport {
  return {
    ...camelcaseKeys(linkCostReport),
    description: linkCostReport.description ?? "",
    cost: maybe.mapOrNull(linkCostReport.cost, costFromHttp),
    contractorReport: maybe.mapOrNull(
      linkCostReport.contractor_reports,
      contractorReportFromHttp,
    ),
  };
}

// todo: parse full cost part of reports, then update view service, then dispauy on table
