/**
 * Cube Utility Functions
 *
 * Shared utilities for cube operations to avoid code duplication.
 */

/**
 * Find the breakdown dimension ID for a given path using exact match and wildcard fallback.
 *
 * This implements the same logic as CubeService.ts to ensure consistency.
 *
 * @param pathKey - The path key to match (e.g., "project:123" or "project:123|contractor:456")
 * @param breakdownMap - The breakdown map containing dimension mappings
 * @param defaultDimensionPriority - Optional priority list for fallback
 * @returns The breakdown dimension ID, or undefined if no match found
 */
export function findBreakdownDimensionId(
  pathKey: string,
  breakdownMap: Record<string, string | null>,
  defaultDimensionPriority?: string[],
): string | null | undefined {
  // First try exact match
  let childDimensionId = breakdownMap[pathKey];

  // If no exact match found (undefined), try wildcard match
  // If exact match is null, don't try wildcard (user explicitly wants raw data)
  if (childDimensionId === undefined) {
    // Try wildcard match by replacing ALL concrete keys in the path with '*'
    const wildcardPath = pathKey
      .split("|")
      .map((segment) => {
        const [dim] = segment.split(":");
        return `${dim}:*`;
      })
      .join("|");

    childDimensionId = breakdownMap[wildcardPath];

    // If still no match and we have a priority list, use it
    if (childDimensionId === undefined && defaultDimensionPriority) {
      childDimensionId = findFirstUnusedDimension(
        pathKey,
        defaultDimensionPriority,
      );
    }
  }

  return childDimensionId;
}

/**
 * Find the first unused dimension from a priority list.
 *
 * @param nodePath - The current path
 * @param priorityList - List of dimension IDs in priority order
 * @returns The first unused dimension ID, or undefined if all are used
 */
function findFirstUnusedDimension(
  nodePath: string,
  priorityList: string[],
): string | null {
  if (!nodePath) {
    // Root node - return first dimension from priority list
    return priorityList[0] || null;
  }

  const usedDimensions = new Set(
    nodePath.split("|").map((segment) => segment.split(":")[0]),
  );

  // Find first dimension from priority list that isn't used
  for (const dimensionId of priorityList) {
    if (!usedDimensions.has(dimensionId)) {
      return dimensionId;
    }
  }

  // All dimensions from priority list are used
  return null;
}
