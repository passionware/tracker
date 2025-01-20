/* eslint-disable @typescript-eslint/no-explicit-any */
import { Sorter } from "@/api/_common/query/sorters/Sorter.ts";
import { PostgrestFilterBuilder } from "@supabase/postgrest-js";

type Builder = PostgrestFilterBuilder<any, any, any, unknown, unknown>;

type MappingSpec = string | { foreignTable: string; foreignColumn: string };

export const sorterSupabaseUtils = {
  sort: function <V extends string, S extends Builder>(
    builder: S,
    sort: Sorter<V>,
    columnMapping: Partial<Record<V, MappingSpec>> | ((key: V) => MappingSpec),
  ): S {
    const resolveColumn =
      typeof columnMapping === "function"
        ? columnMapping
        : (key: V) => columnMapping[key] ?? key;
    const spec = resolveColumn(sort.field);

    const column = typeof spec === "string" ? spec : spec.foreignColumn;

    const foreignTable =
      typeof spec === "string" ? undefined : spec.foreignTable;
    return builder.order(column, {
      ascending: sort.order === "asc",
      foreignTable,
    });
  },
};
