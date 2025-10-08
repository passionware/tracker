/**
 * Generic Multidimensional Cube (BI) Service
 *
 * Provides OLAP-style cube calculation with filtering, grouping, and aggregation.
 */

import type {
  CubeCell,
  CubeConfig,
  CubeDataItem,
  CubeGroup,
  CubeResult,
  DimensionDescriptor,
  DimensionFilter,
  MeasureDescriptor,
  CubeCalculationOptions,
  FilterOperator,
  BreakdownMap,
} from "./CubeService.types.ts";

/**
 * Evaluate a single filter condition
 */
function evaluateFilter(
  value: unknown,
  operator: FilterOperator,
  filterValue: unknown,
): boolean {
  switch (operator) {
    case "equals":
      return value === filterValue;
    case "notEquals":
      return value !== filterValue;
    case "in":
      return Array.isArray(filterValue) && filterValue.includes(value);
    case "notIn":
      return Array.isArray(filterValue) && !filterValue.includes(value);
    case "greaterThan":
      return typeof value === "number" && typeof filterValue === "number"
        ? value > filterValue
        : false;
    case "lessThan":
      return typeof value === "number" && typeof filterValue === "number"
        ? value < filterValue
        : false;
    case "greaterThanOrEqual":
      return typeof value === "number" && typeof filterValue === "number"
        ? value >= filterValue
        : false;
    case "lessThanOrEqual":
      return typeof value === "number" && typeof filterValue === "number"
        ? value <= filterValue
        : false;
    case "contains":
      return typeof value === "string" && typeof filterValue === "string"
        ? value.includes(filterValue)
        : false;
    case "startsWith":
      return typeof value === "string" && typeof filterValue === "string"
        ? value.startsWith(filterValue)
        : false;
    case "endsWith":
      return typeof value === "string" && typeof filterValue === "string"
        ? value.endsWith(filterValue)
        : false;
    default:
      return true;
  }
}

/**
 * Apply filters to the data
 */
function applyFilters<TData extends CubeDataItem>(
  data: TData[],
  filters: DimensionFilter[],
  dimensions: DimensionDescriptor<TData, unknown>[],
): TData[] {
  if (filters.length === 0) return data;

  return data.filter((item) => {
    return filters.every((filter) => {
      const dimension = dimensions.find((d) => d.id === filter.dimensionId);
      if (!dimension) return true; // Skip unknown dimensions

      const value = dimension.getValue(item);
      return evaluateFilter(value, filter.operator, filter.value);
    });
  });
}

/**
 * Calculate measures for a set of items
 */
function calculateMeasures<TData extends CubeDataItem>(
  items: TData[],
  measures: MeasureDescriptor<TData, unknown>[],
): CubeCell[] {
  return measures.map((measure) => {
    const values = items.map((item) => measure.getValue(item));
    const aggregatedValue = measure.aggregate(values);
    const formattedValue = measure.formatValue
      ? measure.formatValue(aggregatedValue)
      : String(aggregatedValue);

    return {
      measureId: measure.id,
      value: aggregatedValue,
      formattedValue,
    };
  });
}

/**
 * Build hierarchical groups with per-node breakdown support
 */
function buildGroupsWithBreakdownMap<TData extends CubeDataItem>(
  data: TData[],
  dimensionId: string,
  breakdownMap: Record<string, string>,
  dimensions: DimensionDescriptor<TData, unknown>[],
  measures: MeasureDescriptor<TData, unknown>[],
  parentPath: string,
  maxDepth: number,
  currentDepth: number,
  includeItems: boolean,
  skipEmptyGroups: boolean,
): CubeGroup[] {
  if (currentDepth >= maxDepth || data.length === 0) {
    return [];
  }

  const dimension = dimensions.find((d) => d.id === dimensionId);
  if (!dimension) return [];

  // Group data by dimension value
  const grouped = new Map<string, TData[]>();
  data.forEach((item) => {
    const value = dimension.getValue(item);
    const key = dimension.getKey
      ? dimension.getKey(value)
      : String(value ?? "null");

    if (!grouped.has(key)) {
      grouped.set(key, []);
    }
    grouped.get(key)!.push(item);
  });

  // Build CubeGroup for each unique value
  const groups: CubeGroup[] = [];
  grouped.forEach((items, key) => {
    if (skipEmptyGroups && items.length === 0) return;

    const firstValue = dimension.getValue(items[0]);
    const label = dimension.formatValue
      ? dimension.formatValue(firstValue)
      : String(firstValue);

    // Build path for this node
    const nodePath = parentPath
      ? `${parentPath}|${dimensionId}:${key}`
      : `${dimensionId}:${key}`;

    // Check if there's a breakdown defined for this node's children
    // First try exact match, then try wildcard match
    let childDimensionId = breakdownMap[nodePath];

    if (!childDimensionId) {
      // Try wildcard match by replacing ALL concrete keys in the parent path with '*'
      // and appending the current dimension wildcard. This allows patterns like
      //   "project:*|taskType:*" to match a node whose parentPath is
      //   "project:Web Application" and the current dimension is "taskType".
      const wildcardParent = parentPath
        ? parentPath
            .split("|")
            .map((segment) => {
              const [dim] = segment.split(":");
              return `${dim}:*`;
            })
            .join("|")
        : "";

      const wildcardPath = wildcardParent
        ? `${wildcardParent}|${dimensionId}:*`
        : `${dimensionId}:*`;

      childDimensionId = breakdownMap[wildcardPath];
    }

    const cells = calculateMeasures(
      items,
      measures as MeasureDescriptor<TData>[],
    );

    const subGroups = childDimensionId
      ? buildGroupsWithBreakdownMap(
          items,
          childDimensionId,
          breakdownMap,
          dimensions,
          measures,
          nodePath,
          maxDepth,
          currentDepth + 1,
          includeItems,
          skipEmptyGroups,
        )
      : undefined;

    groups.push({
      dimensionId,
      dimensionValue: firstValue,
      dimensionKey: key,
      dimensionLabel: label,
      itemCount: items.length,
      cells,
      subGroups,
      items: includeItems ? items : undefined,
      path: nodePath,
      childDimensionId,
    });
  });

  return groups;
}

/**
 * Convert a simple dimension sequence to a breakdownMap with wildcards
 * This is a convenience function for backward compatibility
 *
 * Example:
 *   ["region", "category", "product"]
 * Becomes:
 *   {
 *     "": "region",
 *     "region:*": "category",
 *     "region:*|category:*": "product"
 *   }
 */
function dimensionSequenceToBreakdownMap(dimensionIds: string[]): BreakdownMap {
  const map: BreakdownMap = {};

  if (dimensionIds.length === 0) return map;

  // Root level uses first dimension
  map[""] = dimensionIds[0];

  // Build wildcard patterns for each depth level
  let pathPattern = "";
  for (let i = 0; i < dimensionIds.length - 1; i++) {
    const currentDimension = dimensionIds[i];
    const nextDimension = dimensionIds[i + 1];

    // Build the wildcard path for this level
    if (pathPattern === "") {
      pathPattern = `${currentDimension}:*`;
    } else {
      pathPattern += `|${currentDimension}:*`;
    }

    map[pathPattern] = nextDimension;
  }

  return map;
}

/**
 * Calculate a multidimensional cube from raw data
 */
export function calculateCube<TData extends CubeDataItem>(
  config: CubeConfig<TData>,
  options: CubeCalculationOptions = {},
): CubeResult {
  const {
    includeItems = false,
    maxDepth = 10,
    skipEmptyGroups = false,
  } = options;

  // Step 1: Apply filters
  const filteredData = applyFilters(
    config.data,
    config.filters || [],
    config.dimensions,
  );

  // Step 2: Determine active measures
  const activeMeasures = config.activeMeasures
    ? config.measures.filter((m) => config.activeMeasures!.includes(m.id))
    : config.measures;

  // Step 3: Determine the breakdown map
  let effectiveBreakdownMap: BreakdownMap | undefined = config.breakdownMap;

  // If no breakdownMap but defaultDimensionSequence is provided, convert it
  if (!effectiveBreakdownMap && config.defaultDimensionSequence) {
    effectiveBreakdownMap = dimensionSequenceToBreakdownMap(
      config.defaultDimensionSequence,
    );
  }

  // Step 4: Build groups
  let groups: CubeGroup[] = [];

  if (effectiveBreakdownMap) {
    // Use per-node breakdown mode (PRIMARY mode)
    const rootDimensionId = effectiveBreakdownMap[""];
    if (rootDimensionId) {
      groups = buildGroupsWithBreakdownMap(
        filteredData,
        rootDimensionId,
        effectiveBreakdownMap,
        config.dimensions,
        activeMeasures,
        "",
        maxDepth,
        0,
        includeItems,
        skipEmptyGroups,
      );
    }
  }

  // Step 5: Calculate grand totals
  const grandTotals = calculateMeasures(
    filteredData,
    activeMeasures as MeasureDescriptor<TData>[],
  );

  return {
    groups,
    totalItems: filteredData.length,
    grandTotals,
    config: {
      ...config,
      // Include the effective breakdownMap so CubeView can access it
      breakdownMap: effectiveBreakdownMap,
    } as CubeConfig<CubeDataItem>,
  };
}

/**
 * Helper: Get a cell value from a group
 */
export function getCellValue(
  group: CubeGroup,
  measureId: string,
): unknown | undefined {
  return group.cells.find((c) => c.measureId === measureId)?.value;
}

/**
 * Helper: Get formatted cell value from a group
 */
export function getFormattedCellValue(
  group: CubeGroup,
  measureId: string,
): string | undefined {
  const cell = group.cells.find((c) => c.measureId === measureId);
  return cell?.formattedValue ?? String(cell?.value ?? "");
}

/**
 * Helper: Find groups matching a filter
 */
export function findGroups(
  groups: CubeGroup[],
  predicate: (group: CubeGroup) => boolean,
  recursive = true,
): CubeGroup[] {
  const results: CubeGroup[] = [];

  groups.forEach((group) => {
    if (predicate(group)) {
      results.push(group);
    }
    if (recursive && group.subGroups) {
      results.push(...findGroups(group.subGroups, predicate, recursive));
    }
  });

  return results;
}

/**
 * Helper: Flatten nested groups into a flat array
 */
export function flattenGroups(groups: CubeGroup[]): CubeGroup[] {
  const results: CubeGroup[] = [];

  groups.forEach((group) => {
    results.push(group);
    if (group.subGroups) {
      results.push(...flattenGroups(group.subGroups));
    }
  });

  return results;
}

/**
 * Cube service interface - collection of all cube-related functions
 */
export interface CubeService {
  calculateCube: typeof calculateCube;
  getCellValue: typeof getCellValue;
  getFormattedCellValue: typeof getFormattedCellValue;
  findGroups: typeof findGroups;
  flattenGroups: typeof flattenGroups;
}

/**
 * Create a cube service instance
 */
export function createCubeService(): CubeService {
  return {
    calculateCube,
    getCellValue,
    getFormattedCellValue,
    findGroups,
    flattenGroups,
  };
}

// Export default service instance
export const cubeService = createCubeService();
