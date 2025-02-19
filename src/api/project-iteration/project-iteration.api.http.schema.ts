import camelcaseKeys from "camelcase-keys";
import { z } from "zod";
import {
  ProjectIteration,
  ProjectIterationDetail,
  ProjectIterationPosition,
} from "./project-iteration.api";

export const projectIteration$ = z.object({
  id: z.number(),
  created_at: z.coerce.date(),
  project_id: z.number(),
  period_start: z.coerce.date(),
  period_end: z.coerce.date(),
  description: z.string().nullable(),
  status: z.enum(["draft", "active", "closed"]),
  ordinal_number: z.number(),
  currency: z.string(),
  // todo more fields, nested structure - we load project iteration as a whole, using some view
});
const projectIterationPosition$ = z.object({
  id: z.number(),
  description: z.string(),
  quantity: z.number(),
  unit_price: z.number(),
  unit: z.string(),
  order: z.number(),
});
export type ProjectIterationPosition$ = z.infer<
  typeof projectIterationPosition$
>;
export const projectIterationDetail$ = projectIteration$.merge(
  z.object({
    project_iteration_position: z.array(projectIterationPosition$),
  }),
);

export type ProjectIteration$ = z.infer<typeof projectIteration$>;
export type ProjectIterationDetail$ = z.infer<typeof projectIterationDetail$>;

export function projectIterationFromHttp(
  projectIteration: ProjectIteration$,
): ProjectIteration {
  return camelcaseKeys(projectIteration);
}

export function projectIterationDetailFromHttp({
  project_iteration_position,
  ...projectIteration
}: ProjectIterationDetail$): ProjectIterationDetail {
  return {
    ...camelcaseKeys(projectIteration),
    positions: project_iteration_position.map(
      projectIterationPositionFromHttp,
    ),
  };
}

function projectIterationPositionFromHttp(
  projectIterationPosition: ProjectIterationPosition$,
): ProjectIterationPosition {
  return camelcaseKeys(projectIterationPosition);
}
