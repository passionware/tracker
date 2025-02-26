import {
  contractorBase$,
  contractorBaseFromHttp,
} from "@/api/contractor/contractor.api.http.schema.ts";
import {
  costBase$,
  costBaseFromHttp,
} from "@/api/cost/cost.api.http.schema.base.ts";
import { Cost } from "@/api/cost/cost.api.ts";
import {
  linkCostReport$,
  linkCostReportFromHttp,
} from "@/api/link-cost-report/link-cost-report.http.schema.ts";
import {
  reportBase$,
  reportBaseFromHttp,
} from "@/api/reports/reports.api.http.schema.base.ts";
import { maybe } from "@passionware/monads";
import { z } from "zod";

export const cost$ = costBase$.extend({
  contractor: contractorBase$.nullable(),
  linked_reports: z.array(
    z.object({
      link: linkCostReport$,
      report: reportBase$,
    }),
  ),
});
export type Cost$ = z.infer<typeof cost$>;

export function costFromHttp(cost: Cost$): Cost {
  return {
    ...costBaseFromHttp(cost),
    contractor: maybe.mapOrNull(cost.contractor, contractorBaseFromHttp),
    linkReports: cost.linked_reports.map((link) => ({
      link: linkCostReportFromHttp(link.link),
      report: reportBaseFromHttp(link.report),
    })),
  };
}
