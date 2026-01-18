import { z } from "zod";

export const cockpitCubeReport$ = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable(),
  cube_data: z.record(z.unknown()),
  cube_config: z.record(z.unknown()),
  created_by: z.string().uuid(),
  created_at: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: "Invalid datetime format",
  }),
  updated_at: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: "Invalid datetime format",
  }),
  is_published: z.boolean(),
  start_date: z
    .string()
    .nullable()
    .optional()
    .refine(
      (val) => val === null || val === undefined || !isNaN(Date.parse(val)),
      {
        message: "Invalid start_date format",
      },
    ),
  end_date: z
    .string()
    .nullable()
    .optional()
    .refine(
      (val) => val === null || val === undefined || !isNaN(Date.parse(val)),
      {
        message: "Invalid end_date format",
      },
    ),
});

export type CockpitCubeReport$ = z.infer<typeof cockpitCubeReport$>;
