import { z } from "zod";

export const cockpitTenant$ = z.object({
  id: z.string().uuid(),
  client_id: z.number(),
  name: z.string(),
  logo_url: z.string().nullable(),
  created_at: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: "Invalid datetime format",
  }),
  updated_at: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: "Invalid datetime format",
  }),
});

export type CockpitTenant$ = z.infer<typeof cockpitTenant$>;
