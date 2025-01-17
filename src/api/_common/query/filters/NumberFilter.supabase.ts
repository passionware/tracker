/* eslint-disable @typescript-eslint/no-explicit-any */
import { PostgrestFilterBuilder } from "@supabase/postgrest-js";
import { NumberFilter } from "./NumberFilter.ts";

type Builder = PostgrestFilterBuilder<any, any, any, unknown, unknown>;

export const numberFilterSupabaseUtils = {
  filterBy: function <S extends Builder>(
    builder: S,
    filter: NumberFilter,
    column: string,
  ): S {
    switch (filter.operator) {
      case "equal":
        builder = builder.eq(column, filter.value);
        break;
      case "greaterThan":
        builder = builder.gt(column, filter.value);
        break;
      case "lessThan":
        builder = builder.lt(column, filter.value);
        break;
      case "between":
        builder = builder
          .gte(column, filter.value.from)
          .lte(column, filter.value.to);
    }
    return builder;
  },
};
