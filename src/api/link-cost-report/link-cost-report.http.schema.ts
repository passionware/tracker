import {
  contractorReportBase$,
  contractorReportBaseFromHttp,
} from "@/api/contractor-reports/contractor-reports.api.http.schema.base.ts";
import { cost$, costFromHttp } from "@/api/cost/cost.api.http.schema.ts";
import {
  linkCostReportBase$,
  linkCostReportBaseFromHttp,
} from "@/api/link-cost-report/link-cost-report.http.schema.base.ts";
import { LinkCostReport } from "@/api/link-cost-report/link-cost-report.ts";
import { z } from "zod";

export const linkCostReport$ = linkCostReportBase$.extend({
  cost: cost$,
  report: contractorReportBase$,
});

export type LinkCostReport$ = z.infer<typeof linkCostReport$>;

export function linkCostReportFromHttp(
  linkCostReport: LinkCostReport$,
): LinkCostReport {
  return {
    ...linkCostReportBaseFromHttp(linkCostReport),
    cost: costFromHttp(linkCostReport.cost),
    report: contractorReportBaseFromHttp(linkCostReport.report),
  };
}

// todo: parse full cost part of reports, then update view service, then dispauy on table
