const all = Symbol("all");
export type All = typeof all;
export type IdSpec<Id> = Id | All;

export const idSpecUtils = {
  isAll: (value: unknown): value is All => value === all,
  ofAll: (): All => all,
  mapSpecificOrElse: <V, M, E>(
    value: V,
    map: (value: Exclude<V, All>) => M,
    orElse: E,
  ) => (value === all ? orElse : map(value as Exclude<V, All>)),
  switchAll: <V, S>(value: V, switchTo: S): Exclude<V, All> | S =>
    value === all ? switchTo : (value as Exclude<V, All>),
};
