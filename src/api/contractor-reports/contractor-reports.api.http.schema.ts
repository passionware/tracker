import { z } from "zod";

export const contractorReport$ = z.object({
  id: z.number(),
  contractor_id: z.string(),
  period_start: z.date(),
  period_end: z.date(),
  currency: z.string(),
  net_value: z.number(),
  description: z.string(),
});

export type ContractorReport$ = z.infer<typeof contractorReport$>;
