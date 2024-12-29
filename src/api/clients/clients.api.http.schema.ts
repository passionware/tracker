import { z } from "zod";

export const client$ = z.object({
  id: z.number(),
  name: z.string(),
  avatar_url: z.string().nullable(),
});

export type Client$ = z.infer<typeof client$>;
