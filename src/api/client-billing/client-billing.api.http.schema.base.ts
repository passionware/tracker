import { ClientBillingBase } from "./client-billing.api.ts";
import camelcaseKeys from "camelcase-keys";
import { z } from "zod";

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
});

export type ClientBillingBase$ = z.input<typeof clientBillingBase$>;

export function clientBillingBaseFromHttp(
  clientBilling: ClientBillingBase$,
): ClientBillingBase {
  return {
    ...camelcaseKeys(clientBilling),
  };
}
