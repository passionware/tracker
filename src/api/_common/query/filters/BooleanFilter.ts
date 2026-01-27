import { z } from "zod";

// BooleanFilter Type
export type BooleanFilter = {
  operator: "equal";
  value: boolean;
};

// Utility Functions
export const booleanFilter = {
  // Returns the sign for the filter operator (only "equal" for now)
  getOperatorSign: (): string => "=",

  // Changes the value in the filter
  changeValue: (filter: BooleanFilter, value: boolean): BooleanFilter => ({
    ...filter,
    value,
  }),

  // Creates a default boolean filter
  createDefault: (value: boolean = true): BooleanFilter => ({
    operator: "equal",
    value,
  }),
};

// Zod Schema for BooleanFilter
export const booleanFilterSchema = z.object({
  operator: z.literal("equal"), // only "equal" is allowed as an operator
  value: z.preprocess((val) => {
    if (typeof val === "boolean") return val;
    if (typeof val === "number") return val === 1;
    if (typeof val === "string") {
      const v = val.trim().toLowerCase();
      if (["true", "1", "yes"].includes(v)) return true;
      if (["false", "0", "no"].includes(v)) return false;
    }
    return val;
  }, z.boolean()), // accepts: boolean, "true"/"false", "1"/"0", "yes"/"no", 1/0
});
