import {
  contractorReportBase$,
  contractorReportBaseFromHttp,
} from "@/api/contractor-reports/contractor-report.api.http.schema.base.ts";
import {
  contractor$,
  contractorFromHttp,
} from "@/api/contractor/contractor.api.http.schema.ts";
import {
  costBase$,
  costBaseFromHttp,
} from "@/api/cost/cost.api.http.schema.base.ts";
import { Cost } from "@/api/cost/cost.api.ts";
import {
  linkCostReportBase$,
  linkCostReportBaseFromHttp,
} from "@/api/link-cost-report/link-cost-report.http.schema.base.ts";
import { z } from "zod";

export const cost$ = costBase$.extend({
  contractor: contractor$,
  linked_reports: z.array(
    z.object({
      link_cost_report: linkCostReportBase$,
      contractor_report: contractorReportBase$,
    }),
  ),
});
export type Cost$ = z.infer<typeof cost$>;

export function costFromHttp(cost: Cost$): Cost {
  return {
    ...costBaseFromHttp(cost),
    contractor: contractorFromHttp(cost.contractor),
    linkReports: cost.linked_reports.map((report) => ({
      ...linkCostReportBaseFromHttp(report.link_cost_report),
      report: contractorReportBaseFromHttp(report.contractor_report),
      cost: null,
    })),
  };
}
