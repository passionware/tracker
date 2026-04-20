import type { ProjectRate } from "@/api/rate/rate.api";
import type { RateSnapshot } from "@/api/time-event/time-event.api";
import { z } from "zod";

export const projectRate$ = z.object({
  project_id: z.number(),
  contractor_id: z.number(),
  rate_aggregate_id: z.string().uuid(),
  rate_unit: z.string(),
  rate_quantity: z.coerce.number(),
  rate_unit_price: z.coerce.number(),
  rate_currency: z.string(),
  effective_from: z.coerce.date(),
  version: z.number(),
  last_event_id: z.string().uuid().nullable(),
  updated_at: z.coerce.date(),
});
export type ProjectRate$ = z.infer<typeof projectRate$>;

function rateSnapshotFromRow(row: ProjectRate$): RateSnapshot {
  return {
    unit: row.rate_unit as RateSnapshot["unit"],
    quantity: row.rate_quantity,
    unitPrice: row.rate_unit_price,
    currency: row.rate_currency,
  };
}

export function projectRateFromHttp(row: ProjectRate$): ProjectRate {
  return {
    projectId: row.project_id,
    contractorId: row.contractor_id,
    rateAggregateId: row.rate_aggregate_id,
    rate: rateSnapshotFromRow(row),
    effectiveFrom: row.effective_from,
    version: row.version,
    lastEventId: row.last_event_id,
    updatedAt: row.updated_at,
  };
}
