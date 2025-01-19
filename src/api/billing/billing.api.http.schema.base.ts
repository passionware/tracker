import camelcaseKeys from "camelcase-keys";
import { z } from "zod";
import { BillingBase } from "./billing.api.ts";

export const billingBase$ = z.object({
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

export type BillingBase$ = z.input<typeof billingBase$>;

export function billingBaseFromHttp(billing: BillingBase$): BillingBase {
  return {
    ...camelcaseKeys(billing),
  };
}
