import camelcaseKeys from "camelcase-keys";
import { z } from "zod";

export const generatedReportSource$ = z.object({
  id: z.number(),
  created_at: z.coerce.date(),
  project_iteration_id: z.number(),
  data: z.record(z.any()), // JSONB data
  original_data: z.record(z.any()), // JSONB original data
});

export type GeneratedReportSource$ = z.infer<typeof generatedReportSource$>;

export function generatedReportSourceFromHttp(
  generatedReportSource: GeneratedReportSource$,
) {
  return camelcaseKeys(generatedReportSource);
}
