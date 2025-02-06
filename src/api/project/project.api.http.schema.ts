import { Project } from "@/api/project/project.api.ts";
import camelcaseKeys from "camelcase-keys";
import { z } from "zod";

export const project$ = z.object({
  id: z.number(),
  name: z.string(),
  status: z.enum(["draft", "active", "closed"]),
  created_at: z.coerce.date(),
  description: z.string().nullable(),
  workspace_id: z.number(),
  client_id: z.number(),
});

export type Project$ = z.infer<typeof project$>;

export function projectFromHttp(data: Project$): Project {
  return camelcaseKeys(data);
}
