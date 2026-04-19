import type { Activity } from "@/api/activity/activity.api";
import { z } from "zod";

export const activity$ = z.object({
  id: z.string().uuid(),
  project_id: z.number(),
  name: z.string(),
  description: z.string().nullable(),
  kinds: z.array(z.string()),
  is_archived: z.boolean(),
  version: z.number(),
  last_event_id: z.string().uuid().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
});
export type Activity$ = z.infer<typeof activity$>;

export function activityFromHttp(row: Activity$): Activity {
  return {
    id: row.id,
    projectId: row.project_id,
    name: row.name,
    description: row.description,
    kinds: row.kinds,
    isArchived: row.is_archived,
    version: row.version,
    lastEventId: row.last_event_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
