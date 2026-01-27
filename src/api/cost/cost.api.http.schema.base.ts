import { CostBase } from "@/api/cost/cost.api.ts";
import { parseDate } from "@internationalized/date";
import camelcaseKeys from "camelcase-keys";
import { z } from "zod";

export const costBase$ = z.object({
  id: z.number(),
  created_at: z.coerce.date(),
  invoice_number: z.string().nullable(),
  counterparty: z.string().nullable(),
  description: z.string().nullable(),
  invoice_date: z.string().transform(parseDate),
  net_value: z.number(),
  gross_value: z.number().nullable(),
  contractor_id: z.number().nullable(),
  currency: z.string(),
  workspace_id: z.number(),
  is_committed: z.boolean(),
});

export type CostBase$ = z.output<typeof costBase$>;

export function costBaseFromHttp(cost: CostBase$): CostBase {
  return {
    ...camelcaseKeys(cost),
  };
}
