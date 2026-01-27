/* eslint-disable @typescript-eslint/no-explicit-any */
import { PostgrestFilterBuilder } from "@supabase/postgrest-js";
import { BooleanFilter } from "./BooleanFilter.ts";

type Builder = PostgrestFilterBuilder<any, any, any, any, any>;

export const booleanFilterSupabaseUtils = {
  filterBy: function <S extends Builder>(
    builder: S,
    filter: BooleanFilter,
    column: string,
  ): S {
    switch (filter.operator) {
      case "equal":
        builder = builder.eq(column, filter.value);
        break;
    }
    return builder;
  },
};
