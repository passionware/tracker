import { ReportBase } from "@/api/reports/reports.api.ts";
import camelcaseKeys from "camelcase-keys";
import { z } from "zod";

export const reportBase$ = z.object({
  id: z.number(),
  created_at: z.string(),
  contractor_id: z.number(),
  description: z.string().default(""),
  net_value: z.number(),
  period_start: z.coerce.date(),
  period_end: z.coerce.date(),
  currency: z.string(),
  client_id: z.number(),
  workspace_id: z.number(),
  project_iteration_id: z.number().nullable(),
});
export type ReportBase$ = z.input<typeof reportBase$>;

export function reportBaseFromHttp(report: ReportBase$): ReportBase {
  return {
    ...camelcaseKeys(report),
    description: report.description ?? "",
  };
}
