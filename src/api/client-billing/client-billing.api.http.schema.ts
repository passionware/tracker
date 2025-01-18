import {
  clientBillingBase$,
  clientBillingBaseFromHttp,
} from "@/api/client-billing/client-billing.api.http.schema.base.ts";
import { ClientBilling } from "@/api/client-billing/client-billing.api.ts";
import { clientFromHttp } from "@/api/clients/clients.api.http.adapter.ts";
import { client$ } from "@/api/clients/clients.api.http.schema.ts";
import {
  contractorReportBase$,
  contractorReportBaseFromHttp,
} from "@/api/contractor-reports/contractor-reports.api.http.schema.base.ts";
import {
  contractor$,
  contractorFromHttp,
} from "@/api/contractor/contractor.api.http.schema.ts";
import {
  linkBillingReportBase$,
  linkBillingReportBaseFromHttp,
} from "@/api/link-billing-report/link-billing-report.http.schema.base.ts";
import { z } from "zod";

export const clientBilling$ = clientBillingBase$.extend({
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
      link: linkBillingReportBase$,
      report: contractorReportBase$,
    }),
  ),
  contractors: z.array(z.object({ contractor: contractor$ })),
});

export type ClientBilling$ = z.infer<typeof clientBilling$>;

export function clientBillingFromHttp(
  clientBilling: ClientBilling$,
): ClientBilling {
  return {
    ...clientBillingBaseFromHttp(clientBilling),
    billingBalance: clientBilling.billing_balance,
    totalBillingValue: clientBilling.total_billing_value,
    billingReportValue: clientBilling.total_report_value,
    remainingBalance: clientBilling.remaining_balance,
    client: clientFromHttp(clientBilling.client),
    contractors: clientBilling.contractors.map((c) =>
      contractorFromHttp(c.contractor),
    ),
    linkBillingReport: clientBilling.link_billing_reports.map((x) => ({
      link: linkBillingReportBaseFromHttp({ ...x.link }),
      report: contractorReportBaseFromHttp({ ...x.report }),
    })),
  };
}
