import { z } from "zod";

export const client$ = z.object({
  id: z.number(),
  name: z.string(),
  avatar_url: z.string().nullable(),
  sender_name: z
    .union([z.string(), z.null()])
    .optional()
    .transform((v) => (v === undefined ? null : v)),
});

export type Client$ = z.infer<typeof client$>;
