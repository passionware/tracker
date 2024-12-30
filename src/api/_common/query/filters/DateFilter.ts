import { z } from "zod";

export type DateFilter =
  | {
      operator: "equal";
      value: Date;
    }
  | {
      operator: "greaterThan";
      value: Date;
    }
  | {
      operator: "lessThan";
      value: Date;
    }
  | {
      operator: "between";
      value: {
        from: Date;
        to: Date;
      };
    };

export const dateFilter = {
  getAllOperators: (): DateFilter["operator"][] => {
    return ["equal", "greaterThan", "lessThan", "between"];
  },
  getOperatorSign: (operator: DateFilter["operator"]) => {
    return {
      equal: "=",
      greaterThan: ">",
      lessThan: "<",
      between: "=",
    }[operator];
  },
  changeOperator: (
    filter: DateFilter,
    operator: DateFilter["operator"],
  ): DateFilter => {
    function getLowerBound(filter: DateFilter): Date {
      if (filter.operator === "between") {
        return filter.value.from;
      }
      return filter.value;
    }
    function getUpperBound(filter: DateFilter): Date {
      if (filter.operator === "between") {
        return filter.value.to;
      }
      return filter.value;
    }

    return (
      {
        equal: { operator: "equal", value: getLowerBound(filter) },
        greaterThan: { operator: "greaterThan", value: getUpperBound(filter) },
        lessThan: { operator: "lessThan", value: getLowerBound(filter) },
        between: {
          operator: "between",
          value: { from: getLowerBound(filter), to: getUpperBound(filter) },
        },
      } as const
    )[operator];
  },
};

export const dateFilterSchema = z.discriminatedUnion("operator", [
  z.object({
    operator: z.literal("equal"),
    value: z.coerce.date(),
  }),
  z.object({
    operator: z.literal("greaterThan"),
    value: z.coerce.date(),
  }),
  z.object({
    operator: z.literal("lessThan"),
    value: z.coerce.date(),
  }),
  z.object({
    operator: z.literal("between"),
    value: z.object({
      from: z.coerce.date(),
      to: z.coerce.date(),
    }),
  }),
]);
