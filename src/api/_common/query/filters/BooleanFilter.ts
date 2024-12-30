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
  value: z.boolean(), // the value must be a boolean
});
