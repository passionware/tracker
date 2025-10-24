import { z } from "zod";

export const cockpitCubeReport$ = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable(),
  cube_data: z.record(z.unknown()),
  cube_config: z.record(z.unknown()),
  created_by: z.string().uuid(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export type CockpitCubeReport$ = z.infer<typeof cockpitCubeReport$>;
