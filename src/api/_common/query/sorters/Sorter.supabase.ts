/* eslint-disable @typescript-eslint/no-explicit-any */
import { Sorter } from "@/api/_common/query/sorters/Sorter.ts";
import { PostgrestFilterBuilder } from "@supabase/postgrest-js";

type Builder = PostgrestFilterBuilder<any, any, any, unknown, unknown>;

export const sorterSupabaseUtils = {
  sort: function <V extends string, S extends Builder>(
    builder: S,
    sort: Sorter<V>,
    columnMapping: Partial<Record<V, string>> | ((key: V) => string),
  ): S {
    const resolveColumn =
      typeof columnMapping === "function"
        ? columnMapping
        : (key: V) => columnMapping[key] ?? key;
    const column = resolveColumn(sort.field);
    return builder.order(column, { ascending: sort.order === "asc" });
  },
};
