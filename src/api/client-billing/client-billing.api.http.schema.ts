import { ClientBilling } from "@/api/client-billing/client-billing.api.ts";
import { clientFromHttp } from "@/api/clients/clients.api.http.adapter.ts";
import { Client$, client$ } from "@/api/clients/clients.api.http.schema.ts";
import {
  LinkBillingReport$,
  linkBillingReport$,
  linkBillingReportFromHttp,
} from "@/api/link-billing-report/link-billing-report.http.schema.ts";
import { maybe } from "@passionware/monads";
import camelcaseKeys from "camelcase-keys";
import { z, ZodType } from "zod";

export const clientBillingBase$ = z.object({
  id: z.number(),
  created_at: z.coerce.date(),
  currency: z.string(),
  total_net: z.number(),
  total_gross: z.number(),
  client_id: z.number(),
  invoice_number: z.string(),
  invoice_date: z.coerce.date(),
  description: z.string().nullable(),
  workspace_id: z.number(),
  total_report_value: z.number(),
  //contractors are present in the sql view
  // how much billing is actually linked to reports
  total_billing_value: z.number(),
  // how much of billing is still not linked to reports
  billing_balance: z.number(),
  // difference between billed amount and report amount
  remaining_balance: z.number(),
});

export type ClientBilling$ = z.infer<typeof clientBillingBase$> & {
  link_billing_reports: LinkBillingReport$[];
  client: Client$;
};

export const clientBilling$: ZodType<ClientBilling$> =
  clientBillingBase$.extend({
    client: client$, // todo extract base schema
    link_billing_reports: z.lazy(() => linkBillingReport$.array()),
  });

export function clientBillingFromHttp(
  clientBilling: ClientBilling$,
): ClientBilling {
  return {
    ...camelcaseKeys(clientBilling),
    client: clientFromHttp(clientBilling.client),
    linkBillingReport: maybe.mapOrElse(
      clientBilling.link_billing_reports,
      (x) => x.map(linkBillingReportFromHttp),
      [],
    ),
    billingBalance: clientBilling.billing_balance,
    totalBillingValue: clientBilling.total_billing_value,
    billingReportValue: clientBilling.total_report_value,
    remainingBalance: clientBilling.remaining_balance,
  };
}
