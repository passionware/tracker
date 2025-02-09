import camelcaseKeys from "camelcase-keys";
import { z } from "zod";
import { ProjectIteration } from "./project-iteration.api";

export const projectIteration$ = z.object({
  id: z.number(),
  created_at: z.coerce.date(),
  project_id: z.number(),
  period_start: z.coerce.date(),
  period_end: z.coerce.date(),
  description: z.string().nullable(),
  status: z.enum(["draft", "active", "closed"]),
  ordinal_number: z.number(),
  // todo more fields, nested structure - we load project iteration as a whole, using some view
});

export type ProjectIteration$ = z.infer<typeof projectIteration$>;

export function projectIterationFromHttp(
  projectIteration: ProjectIteration$,
): ProjectIteration {
  return camelcaseKeys(projectIteration);
}
