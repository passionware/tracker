import { Variable } from "@/api/variable/variable.api.ts";
import camelcaseKeys from "camelcase-keys";
import { z } from "zod";

export const variable$ = z.object({
  id: z.number(),
  name: z.string(),
  type: z.enum(["const", "expression"]),
  value: z.string(),
  workspace_id: z.number().nullable(),
  client_id: z.number().nullable(),
  contractor_id: z.number().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
});

export type Variable$ = z.infer<typeof variable$>;

export function variableFromHttp(data: Variable$): Variable {
  return camelcaseKeys(data);
}
