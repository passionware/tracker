import { z } from "zod";

const all = Symbol("all");
export type All = typeof all;
export type IdSpec<Id> = Id | All;

export const idSpecUtils = {
  isAll: (value: unknown): value is All => value === all,
  isSpecific: <V>(value: unknown): value is V => value !== all,
  ofAll: (): All => all,
  mapSpecificOrElse: <V, M, E>(
    value: V,
    map: (value: Exclude<V, All>) => M,
    orElse: E,
  ) => (value === all ? orElse : map(value as Exclude<V, All>)),
  switchAll: <V, S>(value: V, switchTo: S): Exclude<V, All> | S =>
    value === all ? switchTo : (value as Exclude<V, All>),
  takeOrElse: <V, S>(value: unknown, specificValue: V, allValue: S) =>
    value === all ? allValue : specificValue,
};

/**
 * Zod schema for IdSpec values that handles proper serialization/deserialization
 * Converts "all" strings to All symbols and vice versa
 */
export const idSpecSchema = <T extends number | string>() =>
  z.union([
    z.literal("all").transform(() => idSpecUtils.ofAll() as IdSpec<T>),
    z.string().transform((val) => val as T),
    z.number().transform((val) => val as T),
  ]);

/**
 * Zod schema that can serialize IdSpec values to strings for URL params
 * Use this when IdSpec values need to be stored in query parameters
 */
export const serializableIdSpecSchema = <T extends number | string>() =>
  z
    .preprocess(
      (val) => {
        if (val === "all") return idSpecUtils.ofAll();
        return val;
      },
      z.union([
        z.custom<IdSpec<T>>(
          (val) => idSpecUtils.isAll(val) || typeof val === (typeof 0 as any),
        ),
        z.number().transform((val) => val as T),
        z.string().transform((val) => val as T),
      ]),
    )
    .transform((val) => {
      if (idSpecUtils.isAll(val)) return "all";
      return val as T;
    });
