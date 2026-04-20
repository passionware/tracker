import { Contractor, ContractorBase } from "@/api/contractor/contractor.api.ts";
import camelcaseKeys from "camelcase-keys";
import { z } from "zod";

export const contractorBase$ = z.object({
  id: z.number(),
  name: z.string(),
  full_name: z.string(),
  created_at: z.coerce.date(),
  // `contractor.user_id` (FK → auth.users.id) is exposed on both the
  // base table and the `contractor_with_projects` view. We rename it to
  // `authUserId` on the app side so the "Supabase auth layer" coupling
  // is spelled out at the boundary.
  user_id: z.string().uuid().nullable(),
});

export type ContractorBase$ = z.infer<typeof contractorBase$>;
export const contractor$ = contractorBase$.extend({
  project_ids: z.array(z.number()),
});

export type Contractor$ = z.infer<typeof contractor$>;

export function contractorBaseFromHttp(
  contractor: ContractorBase$,
): ContractorBase {
  const { user_id, ...rest } = contractor;
  return { ...camelcaseKeys(rest), authUserId: user_id };
}
export function contractorFromHttp(contractor: Contractor$): Contractor {
  const { user_id, ...rest } = contractor;
  return { ...camelcaseKeys(rest), authUserId: user_id };
}
