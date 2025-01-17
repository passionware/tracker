import { clientBillingBase$ } from "@/api/client-billing/client-billing.api.http.schema.ts";
import {
  contractorReportBase$,
  contractorReportBaseFromHttp,
} from "@/api/contractor-reports/contractor-report.api.http.schema.base.ts";
import { ContractorReport } from "@/api/contractor-reports/contractor-reports.api.ts";
import {
  contractor$,
  contractorFromHttp,
} from "@/api/contractor/contractor.api.http.schema.ts";
import { costBase$ } from "@/api/cost/cost.api.http.schema.base.ts";
import {
  linkBillingReportBase$,
  linkBillingReportBaseFromHttp,
} from "@/api/link-billing-report/link-billing-report.http.schema.base.ts";
import {
  linkCostReportBase$,
  linkCostReportBaseFromHttp,
} from "@/api/link-cost-report/link-cost-report.http.schema.base.ts";
import { z } from "zod";

export const contractorReport$ = contractorReportBase$.extend({
  link_billing_reports: z.array(
    z.object({
      link: linkBillingReportBase$,
      billing: clientBillingBase$,
    }),
  ),
  link_cost_reports: z.array(
    z.object({
      cost: costBase$,
      link: linkCostReportBase$,
    }),
  ),
  contractor: contractor$,
});

export type ContractorReport$ = z.infer<typeof contractorReport$>;

export function contractorReportFromHttp(
  contractorReport: ContractorReport$,
): ContractorReport {
  return {
    ...contractorReportBaseFromHttp(contractorReport),
    linkBillingReport: contractorReport.link_billing_reports
      .map((value) => ({ ...value.link, billing: value.billing }))
      .map(linkBillingReportBaseFromHttp),
    linkCostReport: contractorReport.link_cost_reports
      .map((value) => ({ ...value.link, cost: value.cost }))
      .map(linkCostReportBaseFromHttp),
    contractor: contractorFromHttp(contractorReport.contractor),
  };
}
