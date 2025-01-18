import { omitBy } from "lodash";
import { UseFormReturn } from "react-hook-form";

export function getDirtyFields<
  T extends object,
  F extends {
    [K in keyof T]: unknown;
  },
>(values: T, form: UseFormReturn<F>) {
  return omitBy(values, (_, key) => !form.getFieldState(key as never).isDirty);
}
