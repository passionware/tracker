import { maybe } from "@passionware/monads";
import camelcaseKeys from "camelcase-keys";
import { z } from "zod";
import { parseDate } from "@internationalized/date";
import {
  ProjectIteration,
  ProjectIterationDetail,
  ProjectIterationEvent,
  ProjectIterationPosition,
} from "./project-iteration.api";

export const projectIteration$ = z.object({
  id: z.number(),
  created_at: z.coerce.date(),
  project_id: z.number(),
  period_start: z.string().transform(parseDate),
  period_end: z.string().transform(parseDate),
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
  order: z.number().catch(0),
  project_iteration_id: z.number(),
});

export const accountSpec$ = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("client"),
  }),
  z.object({
    type: z.literal("contractor"),
    contractorId: z.number(),
  }),
  z.object({
    type: z.literal("iteration"),
  }),
  z.object({
    type: z.literal("cost"),
  }),
]);

export const projectIterationEvent$ = z.object({
  id: z.string().uuid(), // UUID v4
  description: z.string(), // np. "licencja przerzucana na klienta"
  moves: z.array(
    z.object({
      from: accountSpec$,
      to: accountSpec$,
      amount: z.number(),
      unit_price: z.number(),
      unit: z.string(),
    }),
  ),
});
export type ProjectIterationEvent$ = z.infer<typeof projectIterationEvent$>;

export type ProjectIterationPosition$ = z.infer<
  typeof projectIterationPosition$
>;
export const projectIterationDetail$ = projectIteration$.merge(
  z.object({
    project_iteration_position: z.array(projectIterationPosition$),
    events: z
      .array(projectIterationEvent$)
      .nullish()
      .transform((x) => maybe.getOrElse(x, [])),
  }),
);

export type ProjectIteration$ = z.output<typeof projectIteration$>;
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
    positions: project_iteration_position.map(projectIterationPositionFromHttp),
    events: projectIteration.events.map(projectIterationEventFromHttp),
  };
}

function projectIterationPositionFromHttp(
  projectIterationPosition: ProjectIterationPosition$,
): ProjectIterationPosition {
  return camelcaseKeys(projectIterationPosition);
}
function projectIterationEventFromHttp(
  projectIterationEvent: ProjectIterationEvent$,
): ProjectIterationEvent {
  return {
    ...camelcaseKeys(projectIterationEvent),
    moves: projectIterationEvent.moves.map(projectIterationMoveFromHttp),
  };
}

function projectIterationMoveFromHttp(
  projectIterationMove: ProjectIterationEvent$["moves"][0],
): ProjectIterationEvent["moves"][0] {
  return camelcaseKeys(projectIterationMove);
}
