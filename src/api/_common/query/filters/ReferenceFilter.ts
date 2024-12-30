import { z } from "zod";

export type ReferenceFilter = {
  oneOf: string[];
};

export const referenceFilterSchema = z.object({
  oneOf: z.array(z.string()),
});
