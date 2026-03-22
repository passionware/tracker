/** Normalizes optional expanded-lane id inputs to a mutable `Set` for the Jotai atom. */
export function expandedLaneIdsToSet(
  iterable?: Iterable<string> | ReadonlySet<string> | null,
): Set<string> {
  if (iterable === undefined || iterable === null) return new Set<string>();
  return new Set<string>(iterable);
}
