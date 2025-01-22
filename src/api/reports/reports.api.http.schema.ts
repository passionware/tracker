import {
  billingBase$,
  billingBaseFromHttp,
} from "@/api/billing/billing.api.http.schema.base.ts";
import { clientFromHttp } from "@/api/clients/clients.api.http.adapter.ts";
import { client$ } from "@/api/clients/clients.api.http.schema.ts";
import {
  contractor$,
  contractorFromHttp,
} from "@/api/contractor/contractor.api.http.schema.ts";
import {
  costBase$,
  costBaseFromHttp,
} from "@/api/cost/cost.api.http.schema.base.ts";
import {
  linkBillingReport$,
  linkBillingReportFromHttp,
} from "@/api/link-billing-report/link-billing-report.http.schema.ts";
import {
  linkCostReport$,
  linkCostReportFromHttp,
} from "@/api/link-cost-report/link-cost-report.http.schema.ts";
import {
  reportBase$,
  reportBaseFromHttp,
} from "@/api/reports/reports.api.http.schema.base.ts";
import { Report } from "@/api/reports/reports.api.ts";
import { maybe } from "@passionware/monads";
import { z } from "zod";

export const report$ = reportBase$.extend({
  link_billing_reports: z.array(
    z.object({
      link: linkBillingReport$,
      billing: billingBase$.nullable(),
    }),
  ),
  link_cost_reports: z.array(
    z.object({
      link: linkCostReport$,
      cost: costBase$.nullable(),
    }),
  ),
  contractor: contractor$,
  client: client$,
  total_billing_billing_value: z.number(),
  total_cost_cost_value: z.number(),
  report_billing_balance: z.number(),
  report_cost_balance: z.number(),
  billing_cost_balance: z.number(),
  immediate_payment_due: z.number(),
  previous_report: reportBase$.nullable(),
});

export type Report$ = z.infer<typeof report$>;

export function reportFromHttp(report: Report$): Report {
  return {
    ...reportBaseFromHttp(report),
    linkBillingReport: report.link_billing_reports.map((value) => ({
      link: linkBillingReportFromHttp(value.link),
      billing: maybe.mapOrNull(value.billing, billingBaseFromHttp),
    })),
    linkCostReport: report.link_cost_reports.map((value) => ({
      link: linkCostReportFromHttp(value.link),
      cost: maybe.mapOrNull(value.cost, costBaseFromHttp),
    })),
    contractor: contractorFromHttp(report.contractor),
    client: clientFromHttp(report.client),
    reportBillingValue: report.total_billing_billing_value,
    reportCostValue: report.total_cost_cost_value,
    reportCostBalance: report.report_cost_balance,
    reportBillingBalance: report.report_billing_balance,
    billingCostBalance: report.billing_cost_balance,
    immediatePaymentDue: report.immediate_payment_due,
    previousReport: maybe.mapOrNull(report.previous_report, reportBaseFromHttp),
  };
}
