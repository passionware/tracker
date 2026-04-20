import type {
  TaskActuals,
  TaskDefinition,
} from "@/api/task-definition/task-definition.api";
import { externalLinkProviderSchema } from "@/api/time-event/time-event.api";
import { z } from "zod";

const externalLink$ = z.object({
  provider: externalLinkProviderSchema,
  externalId: z.string(),
  url: z.string(),
  label: z.string().optional(),
});

export const taskDefinition$ = z.object({
  id: z.string().uuid(),
  project_id: z.number(),
  client_id: z.number(),
  name: z.string(),
  description: z.string().nullable(),
  external_links: z.array(externalLink$),
  assignees: z.array(z.coerce.number().int().positive()),
  estimate_quantity: z.coerce.number().nullable(),
  estimate_unit: z.string().nullable(),
  completed_at: z.coerce.date().nullable(),
  completed_by: z.string().uuid().nullable(),
  is_archived: z.boolean(),
  version: z.number(),
  last_event_id: z.string().uuid().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
});
export type TaskDefinition$ = z.infer<typeof taskDefinition$>;

export function taskDefinitionFromHttp(row: TaskDefinition$): TaskDefinition {
  return {
    id: row.id,
    projectId: row.project_id,
    clientId: row.client_id,
    name: row.name,
    description: row.description,
    externalLinks: row.external_links,
    assignees: row.assignees,
    estimateQuantity: row.estimate_quantity,
    estimateUnit: row.estimate_unit,
    completedAt: row.completed_at,
    completedBy: row.completed_by,
    isArchived: row.is_archived,
    version: row.version,
    lastEventId: row.last_event_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const taskActuals$ = z.object({
  task_id: z.string().uuid(),
  entry_count_total: z.coerce.number(),
  entry_count_active: z.coerce.number(),
  total_seconds: z.coerce.number(),
  total_net_value: z.coerce.number(),
  currency: z.string().nullable(),
  first_started_at: z.coerce.date().nullable(),
  last_stopped_at: z.coerce.date().nullable(),
});
export type TaskActuals$ = z.infer<typeof taskActuals$>;

export function taskActualsFromHttp(row: TaskActuals$): TaskActuals {
  return {
    taskId: row.task_id,
    entryCountTotal: row.entry_count_total,
    entryCountActive: row.entry_count_active,
    totalSeconds: row.total_seconds,
    totalNetValue: row.total_net_value,
    currency: row.currency,
    firstStartedAt: row.first_started_at,
    lastStoppedAt: row.last_stopped_at,
  };
}
