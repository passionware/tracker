import { z } from "zod";

export const contractorReport$ = z.object({
  id: z.number(),
  contractor_id: z.number(),
  period_start: z.coerce.date(),
  period_end: z.coerce.date(),
  currency: z.string(),
  net_value: z.number(),
  description: z.string(),
});

export type ContractorReport$ = z.infer<typeof contractorReport$>;
