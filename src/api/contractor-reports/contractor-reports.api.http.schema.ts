import {
  clientBillingBase$,
  clientBillingBaseFromHttp,
} from "@/api/client-billing/client-billing.api.http.schema.base.ts";
import {
  contractorReportBase$,
  contractorReportBaseFromHttp,
} from "@/api/contractor-reports/contractor-reports.api.http.schema.base.ts";
import { ContractorReport } from "@/api/contractor-reports/contractor-reports.api.ts";
import {
  contractor$,
  contractorFromHttp,
} from "@/api/contractor/contractor.api.http.schema.ts";
import {
  costBase$,
  costBaseFromHttp,
} from "@/api/cost/cost.api.http.schema.base.ts";
import {
  linkBillingReportBase$,
  linkBillingReportBaseFromHttp,
} from "@/api/link-billing-report/link-billing-report.http.schema.base.ts";
import {
  linkCostReportBase$,
  linkCostReportBaseFromHttp,
} from "@/api/link-cost-report/link-cost-report.http.schema.base.ts";
import { maybe } from "@passionware/monads";
import { z } from "zod";

export const contractorReport$ = contractorReportBase$.extend({
  link_billing_reports: z.array(
    z.object({
      link: linkBillingReportBase$,
      billing: clientBillingBase$.nullable(),
    }),
  ),
  link_cost_reports: z.array(
    z.object({
      link: linkCostReportBase$,
      cost: costBase$,
    }),
  ),
  contractor: contractor$,
  total_billing_billing_value: z.number(),
  total_cost_cost_value: z.number(),
  report_billing_balance: z.number(),
  report_cost_balance: z.number(),
  billing_cost_balance: z.number(),
  immediate_payment_due: z.number(),
});

export type ContractorReport$ = z.infer<typeof contractorReport$>;

export function contractorReportFromHttp(
  contractorReport: ContractorReport$,
): ContractorReport {
  return {
    ...contractorReportBaseFromHttp(contractorReport),
    linkBillingReport: contractorReport.link_billing_reports.map((value) => ({
      link: linkBillingReportBaseFromHttp(value.link),
      billing: maybe.mapOrNull(value.billing, clientBillingBaseFromHttp),
    })),
    linkCostReport: contractorReport.link_cost_reports.map((value) => ({
      link: linkCostReportBaseFromHttp(value.link),
      cost: costBaseFromHttp(value.cost),
    })),
    contractor: contractorFromHttp(contractorReport.contractor),
    reportBillingValue: contractorReport.total_billing_billing_value,
    reportCostValue: contractorReport.total_cost_cost_value,
    reportCostBalance: contractorReport.report_cost_balance,
    reportBillingBalance: contractorReport.report_billing_balance,
    billingCostBalance: contractorReport.billing_cost_balance,
    immediatePaymentDue: contractorReport.immediate_payment_due,
  };
}
