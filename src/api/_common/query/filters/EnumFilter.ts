import { Maybe } from "@passionware/monads";
import { z } from "zod";

export type EnumFilter<V> = {
  operator: "oneOf" | "matchNone"; // todo rename oneOf to matchAny, maybe add matchAll
  value: V[];
};

export const enumFilter = {
  isIncluded<V>(filter: EnumFilter<V>, value: V): boolean {
    return filter.value.includes(value);
  },
  include<V>(filter: EnumFilter<V>, value: V): EnumFilter<V> {
    if (enumFilter.isIncluded(filter, value)) return filter;
    return { ...filter, value: [...filter.value, value] };
  },
  exclude<V>(filter: EnumFilter<V>, value: V): EnumFilter<V> {
    return { ...filter, value: filter.value.filter((v) => v !== value) };
  },
  toggle<V>(filter: EnumFilter<V>, value: V): EnumFilter<V> {
    return enumFilter.isIncluded(filter, value)
      ? enumFilter.exclude(filter, value)
      : enumFilter.include(filter, value);
  },
  orDefault<V>(filter: Maybe<EnumFilter<V>>): EnumFilter<V> {
    if (filter) return filter;
    return { operator: "oneOf", value: [] };
  },
  ofOneOf<V>(value: V[]) {
    return { operator: "oneOf", value } satisfies EnumFilter<V>;
  },
  ofMatchNone<V>(value: V[]): EnumFilter<V> {
    return { operator: "matchNone", value };
  },
  matches<V>(filter: Maybe<EnumFilter<V>>, value: V): boolean {
    if (!filter) return true;
    switch (filter.operator) {
      case "oneOf":
        return filter.value.includes(value);
      case "matchNone":
        return !filter.value.includes(value);
    }
  },
};

export const enumFilterSchema = <V>(
  valueSchema: z.ZodType<V>,
): z.ZodType<EnumFilter<V>> =>
  z.object({
    operator: z.enum(["oneOf", "matchNone"] as const),
    value: z.array(valueSchema),
  });
