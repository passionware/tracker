/**
 * @description
 * This is a type that represents a service object.
 * @example
 * ```ts
 * type config = Services[WithResourceUpdateService, WithSheetAccessService];
 *
 * type config2 = {
 *   services:{
 *     sheetAccessService: SheetAccessService;
 *     resourceUpdateService: ResourceUpdateService;
 *   }
 * }
 *
 * ```
 *
 */
export type Services<T extends readonly object[]> = {
  services: UnionToIntersection<T[number]>;
};

export type MergeServices<T extends readonly object[]> = UnionToIntersection<
  T[number]
>;

// Utility to convert a union into an intersection
type UnionToIntersection<U> = (
  U extends unknown ? (arg: U) => void : never
) extends (arg: infer I) => void
  ? I
  : never;
