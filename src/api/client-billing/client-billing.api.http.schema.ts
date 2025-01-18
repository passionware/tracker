import {
  clientBillingBase$,
  clientBillingBaseFromHttp,
} from "@/api/client-billing/client-billing.api.http.schema.base.ts";
import { ClientBilling } from "@/api/client-billing/client-billing.api.ts";
import { clientFromHttp } from "@/api/clients/clients.api.http.adapter.ts";
import { Client$, client$ } from "@/api/clients/clients.api.http.schema.ts";
import {
  LinkBillingReport$,
  linkBillingReport$,
  linkBillingReportFromHttp,
} from "@/api/link-billing-report/link-billing-report.http.schema.ts";
import { maybe } from "@passionware/monads";
import { z, ZodType } from "zod";

export type ClientBilling$ = z.infer<typeof clientBillingBase$> & {
  link_billing_reports: LinkBillingReport$[];
  client: Client$;
  total_report_value: number;
  total_billing_value: number;
  billing_balance: number;
  remaining_balance: number;
};
export const clientBilling$: ZodType<ClientBilling$> =
  clientBillingBase$.extend({ // todo it should not be now circular, so maybe we can just make normal zod here
    total_report_value: z.number(),
    // how much billing is actually linked to reports
    total_billing_value: z.number(),
    // how much of billing is still not linked to reports
    billing_balance: z.number(),
    // difference between billed amount and report amount
    remaining_balance: z.number(),
    client: client$, // todo extract base schema
    link_billing_reports: z.lazy(() => linkBillingReport$.array()),
  });

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
    linkBillingReport: maybe.mapOrElse(
      clientBilling.link_billing_reports,
      (x) => x.map(linkBillingReportFromHttp),
      [],
    ),
  };
}
