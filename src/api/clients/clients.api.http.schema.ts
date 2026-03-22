import { workspace$ } from "@/api/workspace/workspace.api.http.schema.ts";
import { z } from "zod";

export const client$ = z.object({
  id: z.number(),
  name: z.string(),
  avatar_url: z.string().nullable(),
  sender_name: z
    .union([z.string(), z.null()])
    .optional()
    .transform((v) => (v === undefined ? null : v)),
  hidden: z.boolean().default(false),
});

export type Client$ = z.infer<typeof client$>;

export const linkWorkspaceClientWithWorkspace$ = z.object({
  workspace: workspace$,
});

export const linkWorkspaceClientWithClient$ = z.object({
  client: client$,
});
