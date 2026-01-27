import { parseDate } from "@internationalized/date";
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
  invoice_date: z.string().transform(parseDate),
  description: z.string().nullable(),
  workspace_id: z.number(),
  is_committed: z.boolean(),
});

export type BillingBase$ = z.output<typeof billingBase$>;

export function billingBaseFromHttp(billing: BillingBase$): BillingBase {
  return {
    ...camelcaseKeys(billing),
  };
}
