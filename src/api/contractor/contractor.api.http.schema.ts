import { Contractor, ContractorBase } from "@/api/contractor/contractor.api.ts";
import camelcaseKeys from "camelcase-keys";
import { z } from "zod";

export const contractorBase$ = z.object({
  id: z.number(),
  name: z.string(),
  full_name: z.string(),
  created_at: z.coerce.date(),
});

export type ContractorBase$ = z.infer<typeof contractorBase$>;
export const contractor$ = contractorBase$.extend({
  project_ids: z.array(z.number()),
});

export type Contractor$ = z.infer<typeof contractor$>;

export function contractorBaseFromHttp(
  contractor: ContractorBase$,
): ContractorBase {
  return camelcaseKeys(contractor);
}
export function contractorFromHttp(contractor: Contractor$): Contractor {
  return camelcaseKeys(contractor);
}
