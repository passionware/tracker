import { Variable } from "@/api/variable/variable.api.ts";
import camelcaseKeys from "camelcase-keys";
import { z } from "zod";

export const variable$ = z.object({
  id: z.number(),
  name: z.string(),
  type: z.enum(["const", "expression"]),
  value: z.string(),
  workspaceId: z.number().nullable(),
  clientId: z.number().nullable(),
  contractorId: z.number().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type Variable$ = z.infer<typeof variable$>;

export function variableFromHttp(data: Variable$): Variable {
  return camelcaseKeys(data);
}
