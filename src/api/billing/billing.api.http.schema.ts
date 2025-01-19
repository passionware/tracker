import {
  billingBase$,
  billingBaseFromHttp,
} from "@/api/billing/billing.api.http.schema.base.ts";
import { Billing } from "@/api/billing/billing.api.ts";
import { clientFromHttp } from "@/api/clients/clients.api.http.adapter.ts";
import { client$ } from "@/api/clients/clients.api.http.schema.ts";
import {
  contractor$,
  contractorFromHttp,
} from "@/api/contractor/contractor.api.http.schema.ts";
import {
  linkBillingReport$,
  linkBillingReportFromHttp,
} from "@/api/link-billing-report/link-billing-report.http.schema.ts";
import {
  reportBase$,
  reportBaseFromHttp,
} from "@/api/reports/reports.api.http.schema.base.ts";
import { z } from "zod";

export const billing$ = billingBase$.extend({
  // todo it should not be now circular, so maybe we can just make normal zod here
  total_report_value: z.number(),
  // how much billing is actually linked to reports
  total_billing_value: z.number(),
  // how much of billing is still not linked to reports
  billing_balance: z.number(),
  // difference between billed amount and report amount
  remaining_balance: z.number(),
  client: client$, // todo extract base schema
  link_billing_reports: z.array(
    z.object({
      link: linkBillingReport$,
      report: reportBase$,
    }),
  ),
  contractors: z.array(z.object({ contractor: contractor$ })),
});

export type Billing$ = z.infer<typeof billing$>;

export function billingFromHttp(billing: Billing$): Billing {
  return {
    ...billingBaseFromHttp(billing),
    billingBalance: billing.billing_balance,
    totalBillingValue: billing.total_billing_value,
    billingReportValue: billing.total_report_value,
    remainingBalance: billing.remaining_balance,
    client: clientFromHttp(billing.client),
    contractors: billing.contractors.map((c) =>
      contractorFromHttp(c.contractor),
    ),
    linkBillingReport: billing.link_billing_reports.map((x) => ({
      link: linkBillingReportFromHttp({ ...x.link }),
      report: reportBaseFromHttp({ ...x.report }),
    })),
  };
}
