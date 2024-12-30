import { Maybe, maybe } from "@passionware/monads";

export type SortOrder = "asc" | "desc";

export interface Sorter<Field> {
  field: Field;
  order: SortOrder;
}

export const sorter = {
  next: <Field>(sorter: Maybe<Sorter<Field>>, field: Field): Sorter<Field> => {
    if (sorter?.field === field) {
      return {
        field,
        order: sorter.order === "asc" ? "desc" : "asc",
      };
    }
    return {
      field,
      order: "asc",
    };
  },
  ensureField: <Field>(sorter: Maybe<Sorter<Field>>, field: Field) => {
    if (sorter?.field === field) {
      return sorter;
    }
    return maybe.ofAbsent();
  },
  createComparator: <T, Field extends string>(sorter: Maybe<Sorter<Field>>) => {
    function getObjValue(o: unknown, field: string) {
      if (typeof o === "object" && o !== null) {
        if (field in o) {
          return o[field as keyof typeof o];
        }
      }
      return "";
    }
    if (sorter) {
      return (a: T, b: T) => {
        const aValue = getObjValue(a, sorter.field);
        const bValue = getObjValue(b, sorter.field);
        if (aValue < bValue) {
          return sorter.order === "asc" ? -1 : 1;
        }
        if (aValue > bValue) {
          return sorter.order === "asc" ? 1 : -1;
        }
        return 0;
      };
    }
    return () => 0;
  },
};
