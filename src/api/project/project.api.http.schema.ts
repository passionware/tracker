import { Project } from "@/api/project/project.api.ts";
import camelcaseKeys from "camelcase-keys";
import { z } from "zod";

export const project$ = z.object({
  id: z.number(),
  name: z.string(),
  status: z.enum(["draft", "active", "closed"]),
  created_at: z.coerce.date(),
  description: z.string().nullable(),
  client_id: z.number(),
  link_project_workspace: z.array(
    z.object({
      workspace_id: z.number(),
      is_primary: z.boolean(),
    }),
  ),
});

export type Project$ = z.infer<typeof project$>;

export function projectFromHttp({
  link_project_workspace,
  ...data
}: Project$): Project {
  const camelData = camelcaseKeys(data);

  // Extract workspace_ids from the link_project_workspace array
  const workspaceIds = link_project_workspace.map((link) => link.workspace_id);

  return {
    ...camelData,
    workspaceIds,
  };
}
