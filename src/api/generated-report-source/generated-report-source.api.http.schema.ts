import camelcaseKeys from "camelcase-keys";
import { z } from "zod";
import { GeneratedReportSource } from "./generated-report-source.api";
import { GenericReport } from "@/services/io/_common/GenericReport";
import { mapValues } from "lodash";

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

const projectType$ = z.object({
  name: z.string(),
  description: z.string(),
  parameters: z.record(z.any()),
  budgetCap: z
    .object({
      amount: z.number(),
      currency: z.string(),
    })
    .optional(),
});

const roleType$ = z.object({
  name: z.string(),
  description: z.string(),
  rates: z.array(
    z.preprocess(
      (data) => {
        // Normalize singular/plural keys for compatibility with GenericReport schema
        if (typeof data === "object" && data !== null) {
          const fixed = { ...data } as Record<string, unknown>;

          // If 'taskType' exists and 'taskTypes' does not, map to an array
          if ("taskType" in fixed && !("taskTypes" in fixed)) {
            fixed.taskTypes = Array.isArray(fixed.taskType)
              ? fixed.taskType
              : [fixed.taskType];
            delete fixed.taskType;
          }

          // If 'activityType' exists and 'activityTypes' does not, map to an array
          if ("activityType" in fixed && !("activityTypes" in fixed)) {
            fixed.activityTypes = Array.isArray(fixed.activityType)
              ? fixed.activityType
              : [fixed.activityType];
            delete fixed.activityType;
          }

          // If 'projectId' exists and 'projectIds' does not, map to an array
          if ("projectId" in fixed && !("projectIds" in fixed)) {
            fixed.projectIds = Array.isArray(fixed.projectId)
              ? fixed.projectId
              : [fixed.projectId];
            delete fixed.projectId;
          }

          return fixed;
        }
        return data;
      },
      z.object({
        billing: z.literal("hourly"),
        activityTypes: z.array(z.string()).default([]),
        taskTypes: z.array(z.string()).default([]),
        projectIds: z.array(z.string()).default([]),
        costRate: z.number(),
        costCurrency: z.string(),
        billingRate: z.number(),
        billingCurrency: z.string(),
      }),
    ),
  ),
});

const genericReport$ = z.object({
  definitions: z.object({
    taskTypes: z.record(taskType$),
    activityTypes: z.record(activityType$),
    projectTypes: z.record(projectType$),
    roleTypes: z.record(roleType$),
  }),
  timeEntries: z.array(
    z.object({
      id: z.string(),
      note: z.string().nullable(),
      taskId: z.string(),
      activityId: z.string(),
      projectId: z.string(),
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
  return {
    ...camelcaseKeys(generatedReportSource),
    data: fixLegacyRates(
      generatedReportSource.data,
      generatedReportSource.created_at,
    ),
    originalData: generatedReportSource.original_data,
  }; // camelCaseKeys for some reason makes the original_data optional
}

function fixLegacyRates(data: GenericReport, dateCreated: Date): GenericReport {
  if (dateCreated < new Date("2026-01-18")) {
    return {
      ...data,
      definitions: {
        ...data.definitions,
        roleTypes: mapValues(data.definitions.roleTypes, (role) => {
          return {
            ...role,
            rates: role.rates.map((rate) => {
              return {
                ...rate,
                activityTypes: [],
                taskTypes: [],
                projectIds: [],
              };
            }),
          };
        }),
      },
    };
  }
  return data;
}
