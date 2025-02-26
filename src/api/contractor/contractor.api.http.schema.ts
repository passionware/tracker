import { Contractor } from "@/api/contractor/contractor.api.ts";
import camelcaseKeys from "camelcase-keys";
import { z } from "zod";

export const contractor$ = z.object({
  id: z.number(),
  name: z.string(),
  full_name: z.string(),
  created_at: z.coerce.date(),
  project_ids: z.array(z.number()),
});

export type Contractor$ = z.infer<typeof contractor$>;

export function contractorFromHttp(contractor: Contractor$): Contractor {
  return camelcaseKeys(contractor);
}
