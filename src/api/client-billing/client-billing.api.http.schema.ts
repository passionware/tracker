import { z } from "zod";

export const clientBilling$ = z.object({
  id: z.number(),
  created_at: z.string(),
  currency: z.string().nullable(),
  total_net: z.number().nullable(),
  total_gross: z.number().nullable(),
  client_id: z.number(),
  invoice_number: z.string(),
  invoice_date: z.string(),
  description: z
    .string()
    .nullable()
    .transform((v) => v ?? ""),
});

export type ClientBilling$ = z.infer<typeof clientBilling$>;
