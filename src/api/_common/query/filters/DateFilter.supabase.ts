import { PostgrestFilterBuilder } from "@supabase/postgrest-js";
import { endOfDay, startOfDay } from "date-fns";
import { DateFilter } from "./DateFilter";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Builder = PostgrestFilterBuilder<any, any, any, unknown, unknown>;

export const dateFilterSupabaseUtils = {
  filterBy: function <S extends Builder>(
    builder: S,
    filter: DateFilter,
    column: string,
  ): S {
    switch (filter.operator) {
      case "equal":
        builder = builder
          .gte(column, startOfDay(filter.value).toISOString())
          .lte(column, endOfDay(filter.value).toISOString());
        break;
      case "greaterThan":
        builder = builder.gt(column, endOfDay(filter.value).toISOString());
        break;
      case "lessThan":
        builder = builder.lt(column, startOfDay(filter.value).toISOString());
        break;
      case "between":
        builder = builder
          .gte(column, startOfDay(filter.value.from).toISOString())
          .lte(column, endOfDay(filter.value.to).toISOString());
        break;
    }
    return builder;
  },
  filterByRangeOverlap: function <S extends Builder>(
    builder: S,
    filter: DateFilter,
    startColumn: string,
    endColumn: string,
  ): S {
    switch (filter.operator) {
      case "equal":
        builder = builder
          .lte(startColumn, endOfDay(filter.value).toISOString())
          .gte(endColumn, startOfDay(filter.value).toISOString());
        break;
      case "greaterThan":
        builder = builder.gt(endColumn, endOfDay(filter.value).toISOString());
        break;
      case "lessThan":
        builder = builder.lt(
          startColumn,
          startOfDay(filter.value).toISOString(),
        );
        break;
      case "between":
        builder = builder
          .lte(startColumn, endOfDay(filter.value.to).toISOString())
          .gte(endColumn, startOfDay(filter.value.from).toISOString());
        break;
    }
    return builder;
  },
};
