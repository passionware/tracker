import { maybe, Maybe } from "@passionware/monads";

/**
 * Special type representing the absence of a value or unassigned value.
 * It's important to not confuse with `null` or `undefined` as they are used to determine lack of choice not lack of value.
 * For example - ContractorPicker.value === null/undefined - means no contractor filter is applied.
 * For example - ContractorPicker.value === none - means we want only items with no contractor assigned.
 */
const unassigned = Symbol("unassigned");
export type Unassigned = typeof unassigned;
export const unassignedUtils = {
  isUnassigned: (value: unknown): value is Unassigned => {
    return value === unassigned;
  },
  isAssigned: <T>(value: Maybe<T | Unassigned>): value is T => {
    return !unassignedUtils.isUnassigned(value);
  },
  ofUnassigned: (): Unassigned => unassigned,
  map: <T>(value: Maybe<T | Unassigned>, fn: () => T): Maybe<T> => {
    if (unassignedUtils.isUnassigned(value)) {
      return fn();
    }
    return value;
  },
  mapOrElse: <T, M, E>(
    value: T | Unassigned,
    fn: (value: T) => M,
    defaultValue: E,
  ): M | E => {
    if (unassignedUtils.isUnassigned(value)) {
      return defaultValue;
    }
    return fn(value);
  },
  getOrElse: <T, E>(value: T | Unassigned, defaultValue: E): T | E => {
    if (unassignedUtils.isUnassigned(value)) {
      return defaultValue;
    }
    return value;
  },
  takeOrElse: <T, E>(
    value: unknown,
    assignedValue: T,
    unassignedValue: E,
  ): T | E => {
    if (unassignedUtils.isUnassigned(value)) {
      return unassignedValue;
    }
    return assignedValue;
  },
  getOrNull: <T>(value: T | Unassigned) => {
    return unassignedUtils.getOrElse(value, null);
  },
  fromMaybe: <T>(value: Maybe<T>): T | Unassigned =>
    maybe.getOrElse(value, unassignedUtils.ofUnassigned()),
};
