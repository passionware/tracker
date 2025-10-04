import camelcaseKeys from "camelcase-keys";
import { z } from "zod";
import { GeneratedReportSource } from "./generated-report-source.api";

const taskType$ = z.object({
  name: z.string(),
  description: z.string(),
  parameters: z.record(z.any()),
});

const activityType$ = z.object({
  name: z.string(),
  description: z.string(),
  parameters: z.record(z.any()),
});

const roleType$ = z.object({
  name: z.string(),
  description: z.string(),
  rates: z.array(
    z.object({
      billing: z.literal("hourly"),
      activityType: z.string(),
      taskType: z.string(),
      currency: z.string(),
      rate: z.number(),
    }),
  ),
});

const genericReport$ = z.object({
  definitions: z.object({
    taskTypes: z.record(taskType$),
    activityTypes: z.record(activityType$),
    roleTypes: z.record(roleType$),
  }),
  timeEntries: z.array(
    z.object({
      id: z.string(),
      note: z.string(),
      taskId: z.string(),
      activityId: z.string(),
      roleId: z.string(),
      contractorId: z.number(),
      createdAt: z.coerce.date(),
      updatedAt: z.coerce.date(),
      startAt: z.coerce.date(),
      endAt: z.coerce.date(),
    }),
  ),
});

export const generatedReportSource$ = z.object({
  id: z.number(),
  created_at: z.coerce.date(),
  project_iteration_id: z.number(),
  data: genericReport$, // Properly typed GenericReport
  original_data: z.any(),
});

export type GeneratedReportSource$ = z.infer<typeof generatedReportSource$>;

export function generatedReportSourceFromHttp(
  generatedReportSource: GeneratedReportSource$,
): GeneratedReportSource {
  return camelcaseKeys(generatedReportSource) as GeneratedReportSource; // camelCaseKeys for some reason makes the original_data optional
}
