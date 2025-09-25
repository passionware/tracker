/* eslint-disable @typescript-eslint/no-explicit-any */
import { EnumFilter } from "@/api/_common/query/filters/EnumFilter.ts";
import { PostgrestFilterBuilder } from "@supabase/postgrest-js";

type Builder = PostgrestFilterBuilder<any, any, any, any, any>;

export const enumFilterSupabaseUtils = {
  filterBy: {
    oneToMany: function <V, S extends Builder>(
      builder: S,
      filter: EnumFilter<V>,
      column: string,
    ): S {
      const values = filter.value;
      const includesNull = values.includes(null as any);
      const nonNullValues = values.filter((v) => v !== null);

      switch (filter.operator) {
        case "oneOf":
          if (includesNull) {
            builder = builder.or(
              `${column}.in.(${nonNullValues.join(",")}),${column}.is.null`,
            );
          } else {
            builder = builder.filter(
              column,
              "in",
              `(${nonNullValues.join(",")})`,
            );
          }
          break;
        case "matchNone":
          if (includesNull) {
            builder = builder.or(
              `${column}.not.in.(${nonNullValues.join(",")}),${column}.not.is.null`,
            );
          } else {
            builder = builder.not(column, "in", `(${nonNullValues.join(",")})`);
          }
          break;
      }
      return builder;
    },
    arrayColumn: function <V, S extends Builder>(
      builder: S,
      filter: EnumFilter<V>,
      column: string,
    ): S {
      const values = filter.value;
      const includesNull = values.includes(null as any);
      const nonNullValues = values.filter((v) => v !== null);

      switch (filter.operator) {
        case "oneOf":
          if (includesNull) {
            builder = builder.or(
              `${column}.ov.{${nonNullValues.join(",")}},${column}.is.null`,
            );
          } else {
            builder = builder.filter(
              column,
              "ov",
              `{${nonNullValues.join(",")}}`,
            );
          }
          break;
        case "matchNone":
          if (includesNull) {
            builder = builder.or(
              `${column}.not.ov.{${nonNullValues.join(",")}},${column}.not.is.null`,
            );
          } else {
            builder = builder.not(column, "ov", `{${nonNullValues.join(",")}}`);
          }
          break;
      }
      return builder;
    },
  },
};
