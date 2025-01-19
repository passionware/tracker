/* eslint-disable @typescript-eslint/no-explicit-any */
import { EnumFilter } from "@/api/_common/query/filters/EnumFilter.ts";
import { PostgrestFilterBuilder } from "@supabase/postgrest-js";

type Builder = PostgrestFilterBuilder<any, any, any, unknown, unknown>;

// todo: support null in filter
export const enumFilterSupabaseUtils = {
  filterBy: {
    oneToMany: function <V, S extends Builder>(
      builder: S,
      filter: EnumFilter<V>,
      column: string,
    ): S {
      switch (filter.operator) {
        case "oneOf":
          builder = builder.filter(column, "in", filter.value);
          break;
        case "matchNone":
          builder = builder.not(column, "in", filter.value);
          break;
      }
      return builder;
    },
    arrayColumn: function <V, S extends Builder>(
      builder: S,
      filter: EnumFilter<V>,
      column: string,
    ): S {
      switch (filter.operator) {
        case "oneOf":
          builder = builder.filter(column, "ov", filter.value);
          break;
        case "matchNone":
          builder = builder.not(column, "ov", filter.value);
          break;
      }
      return builder;
    },
  },
};
