/**
 * Cube Utility Functions
 *
 * Shared utilities for cube operations to avoid code duplication.
 */

/**
 * Find the breakdown dimension ID for a given path using node state and fallback logic.
 *
 * @param pathKey - The path key to match (e.g., "project:123" or "project:123|contractor:456")
 * @param nodeStates - Map of node states containing user overrides
 * @param initialGrouping - Priority list for fallback
 * @returns The breakdown dimension ID, or undefined if no match found
 */
export function findBreakdownDimensionId(
  pathKey: string,
  nodeStates: Map<
    string,
    { isExpanded: boolean; childDimensionId?: string | null }
  >,
  initialGrouping: string[],
): string | null | undefined {
  // First try to get explicit user override from node state
  const nodeState = nodeStates.get(pathKey);
  let childDimensionId = nodeState?.childDimensionId;

  // If no explicit override and we have a priority list, use fallback logic
  if (childDimensionId === undefined && initialGrouping) {
    childDimensionId = findFirstUnusedDimension(
      pathKey,
      initialGrouping,
      nodeStates,
    );
  }

  return childDimensionId;
}

/**
 * Find the first unused dimension from a priority list.
 *
 * @param nodePath - The current path
 * @param priorityList - List of dimension IDs in priority order
 * @param nodeStates - Map of node states to check for overridden dimensions
 * @returns The first unused dimension ID, or undefined if all are used
 */
export function findFirstUnusedDimension(
  nodePath: string,
  priorityList: string[],
  nodeStates: Map<
    string,
    { isExpanded: boolean; childDimensionId?: string | null }
  >,
): string | null {
  if (!nodePath) {
    // Root node - return first dimension from priority list
    return priorityList[0] || null;
  }

  // Get dimensions used in current path
  const pathDimensions = nodePath
    .split("|")
    .map((segment) => segment.split(":")[0]);

  // Get root override dimension
  const rootOverride = nodeStates.get("")?.childDimensionId;

  // Combine used dimensions
  const usedDimensions = new Set([
    ...pathDimensions,
    ...(rootOverride ? [rootOverride] : []),
  ]);

  // Find first unused dimension
  return priorityList.find((dim) => !usedDimensions.has(dim)) || null;
}
