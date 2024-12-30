import { z } from "zod";

export type NumberFilter =
  | {
      operator: "equal";
      value: number;
    }
  | {
      operator: "greaterThan";
      value: number;
    }
  | {
      operator: "lessThan";
      value: number;
    }
  | {
      operator: "between";
      value: {
        from: number;
        to: number;
      };
    };

type NumberFilterKeys = NumberFilter["operator"];

export const numberFilter = {
  getAllOperators: (): NumberFilterKeys[] => {
    return ["equal", "greaterThan", "lessThan", "between"];
  },
  ensureNumbers: (filter: NumberFilter): NumberFilter => {
    if (filter.operator === "between") {
      return {
        ...filter,
        value: {
          from: Number(filter.value.from),
          to: Number(filter.value.to),
        },
      };
    }
    return {
      ...filter,
      value: Number(filter.value),
    };
  },
  getOperatorSign: (operator: NumberFilter["operator"]) => {
    return {
      equal: "=",
      greaterThan: ">",
      lessThan: "<",
      between: "=",
    }[operator];
  },
  changeOperator: (
    filter: NumberFilter,
    operator: NumberFilter["operator"],
  ): NumberFilter => {
    function getLowerBound(filter: NumberFilter): number {
      if (filter.operator === "between") {
        return filter.value.from;
      }
      return filter.value;
    }
    function getUpperBound(filter: NumberFilter): number {
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

export const numberFilterSchema = z.discriminatedUnion("operator", [
  z.object({
    operator: z.literal("equal"),
    value: z.coerce.number(),
  }),
  z.object({
    operator: z.literal("greaterThan"),
    value: z.coerce.number(),
  }),
  z.object({
    operator: z.literal("lessThan"),
    value: z.coerce.number(),
  }),
  z.object({
    operator: z.literal("between"),
    value: z.object({
      from: z.coerce.number(),
      to: z.coerce.number(),
    }),
  }),
]);
