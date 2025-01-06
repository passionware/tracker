import { Workspace } from "@/api/workspace/workspace.api.ts";
import { z } from "zod";

export const workspace$ = z.object({
  id: z.number(),
  name: z.string(),
  slug: z.string(),
  avatarUrl: z.string().optional(),
});

export type Workspace$ = z.infer<typeof workspace$>;

export function workspaceFromHttp(data: Workspace$): Workspace {
  return {
    id: Number(data.id),
    name: data.name,
    slug: data.slug,
    avatarUrl: data.avatarUrl,
  };
}
