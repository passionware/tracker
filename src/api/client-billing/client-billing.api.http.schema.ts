import { ClientBilling } from "@/api/client-billing/client-billing.api.ts";
import { clientFromHttp } from "@/api/clients/clients.api.http.adapter.ts";
import { client$ } from "@/api/clients/clients.api.http.schema.ts";
import {
  LinkBillingReport$,
  linkBillingReport$,
  linkBillingReportFromHttp,
} from "@/api/link-billing-report/link-billing.report.http.schema.ts";
import { maybe } from "@passionware/monads";
import camelcaseKeys from "camelcase-keys";
import { z, ZodType } from "zod";

const clientBillingBase$ = z.object({
  id: z.number(),
  created_at: z.coerce.date(),
  currency: z.string(),
  total_net: z.number(),
  total_gross: z.number(),
  client_id: z.number(),
  invoice_number: z.string(),
  invoice_date: z.coerce.date(),
  description: z.string().nullable(),
  client: client$.nullish(),
});

export type ClientBilling$ = z.infer<typeof clientBillingBase$> & {
  link_billing_report?: LinkBillingReport$[];
};

export const clientBilling$: ZodType<ClientBilling$> =
  clientBillingBase$.extend({
    link_billing_report: z.lazy(() => linkBillingReport$.array()).optional(),
  });

export function clientBillingFromHttp(
  clientBilling: ClientBilling$,
): ClientBilling {
  return {
    ...camelcaseKeys(clientBilling),
    client: maybe.mapOrNull(clientBilling.client, clientFromHttp),
    linkBillingReport: maybe.mapOrElse(
      clientBilling.link_billing_report,
      (x) => x.map(linkBillingReportFromHttp),
      [],
    ),
  };
}
