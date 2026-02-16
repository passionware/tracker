import { z } from "zod";
import { genericReport$ } from "@/api/generated-report-source/generated-report-source.api.http.schema";

const scope$ = z.object({
  workspaceIds: z.array(z.number()).optional(),
  clientIds: z.array(z.number()).optional(),
  contractorIds: z.array(z.number()).optional(),
  projectIterationIds: z
    .union([z.array(z.number()), z.literal("all_active")])
    .optional(),
});

export const tmetricDashboardCacheEntry$ = z.object({
  id: z.number(),
  created_at: z.coerce.date(),
  created_by: z.string().nullable(),
  period_start: z.coerce.date(),
  period_end: z.coerce.date(),
  scope: scope$,
  data: genericReport$,
});

export type TmetricDashboardCacheEntry$ = z.infer<
  typeof tmetricDashboardCacheEntry$
>;

export function tmetricDashboardCacheEntryFromHttp(
  row: TmetricDashboardCacheEntry$,
) {
  return {
    id: row.id,
    createdAt: row.created_at,
    createdBy: row.created_by,
    periodStart: row.period_start,
    periodEnd: row.period_end,
    scope: row.scope,
    data: row.data,
  };
}
