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
  due_date: z
    .string()
    .nullable()
    .transform((s) => (s ? parseDate(s) : null)),
  description: z.string().nullable(),
  workspace_id: z.number(),
  is_committed: z.boolean(),
  paid_at: z
    .string()
    .nullable()
    .transform((s) => (s ? parseDate(s) : null)),
  paid_at_justification: z.string().nullable(),
});

export type BillingBase$ = z.output<typeof billingBase$>;

export function billingBaseFromHttp(billing: BillingBase$): BillingBase {
  return {
    ...camelcaseKeys(billing),
  };
}
