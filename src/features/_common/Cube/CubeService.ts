/**
 * Generic Multidimensional Cube (BI) Service
 *
 * Provides OLAP-style cube calculation with filtering, grouping, and aggregation.
 */

import type {
  CubeCalculationOptions,
  CubeCell,
  CubeConfig,
  CubeDataItem,
  CubeGroup,
  CubeResult,
  DimensionDescriptor,
  DimensionFilter,
  FilterOperator,
  MeasureDescriptor,
} from "./CubeService.types.ts";
import { findBreakdownDimensionId } from "./CubeUtils.ts";
import { createSortFunction } from "./CubeSortOptions.ts";
import type { PathItem } from "./useCubeState.ts";

/**
 * Helper: Convert current path to the same key format used by useCubeState
 */
function getCurrentPathKey(
  currentPath: PathItem[],
  dimensions: DimensionDescriptor<any, unknown>[],
): string {
  return currentPath
    .map((p) => {
      const dim = dimensions.find((d) => d.id === p.dimensionId);
      const key = dim?.getKey
        ? dim.getKey(p.dimensionValue)
        : String(p.dimensionValue ?? "null");
      return `${p.dimensionId}:${key}`;
    })
    .join("|");
}

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
  nodeStates: Map<
    string,
    {
      isExpanded: boolean;
      childDimensionId?: string | null;
      sortState?: { sortOptionId?: string; direction?: "asc" | "desc" };
    }
  >,
  dimensions: DimensionDescriptor<TData, unknown>[],
  measures: MeasureDescriptor<TData, unknown>[],
  parentPath: string,
  maxDepth: number,
  currentDepth: number,
  includeItems: boolean,
  skipEmptyGroups: boolean,
  dimensionPriority: string[],
  currentPath: PathItem[] = [],
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
    // Use shared utility function for consistent logic across tree expansion and zoom-in
    const childDimensionId = findBreakdownDimensionId(
      nodePath,
      nodeStates,
      dimensionPriority,
    );

    const cells = calculateMeasures(
      items,
      measures as MeasureDescriptor<TData>[],
    );

    // Build subgroups if we have a valid dimension
    const subGroups = childDimensionId
      ? buildGroupsWithBreakdownMap(
          items,
          childDimensionId,
          nodeStates,
          dimensions,
          measures,
          nodePath,
          maxDepth,
          currentDepth + 1,
          includeItems,
          skipEmptyGroups,
          dimensionPriority,
          [...currentPath, { dimensionId, dimensionValue: firstValue }],
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

  // Sort groups based on sort state
  const currentPathKey = getCurrentPathKey(currentPath, dimensions);
  const sortState = nodeStates.get(currentPathKey)?.sortState;

  if (sortState?.sortOptionId) {
    console.log("🔍 Sorting debug:", {
      sortOptionId: sortState.sortOptionId,
      direction: sortState.direction,
      dimensionId,
      groupsCount: groups.length,
    });

    // Check if it's a measure-based sort
    if (sortState.sortOptionId.startsWith("measure-")) {
      const measureId = sortState.sortOptionId.replace("measure-", "");
      const measure = measures.find((m) => m.id === measureId);

      if (measure) {
        // Sort by measure values
        groups.sort((a, b) => {
          const aValue =
            a.cells.find((c) => c.measureId === measureId)?.value || 0;
          const bValue =
            b.cells.find((c) => c.measureId === measureId)?.value || 0;

          const result = Number(aValue) - Number(bValue);
          return sortState.direction === "desc" ? -result : result;
        });
      }
    } else {
      // Sort by dimension values using dimension sort options
      const sortFunction = createSortFunction(dimension, sortState);
      if (sortFunction) {
        groups.sort((a, b) => sortFunction(a.dimensionValue, b.dimensionValue));
      }
    }
  } else if (dimension.sortOptions && dimension.sortOptions.length > 0) {
    // Use default sort option if no sort state specified
    const defaultSortFunction = createSortFunction(dimension, undefined);
    if (defaultSortFunction) {
      groups.sort((a, b) =>
        defaultSortFunction(a.dimensionValue, b.dimensionValue),
      );
    }
  }

  return groups;
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
    zoomPath = [], // New option for zoom functionality
  } = options;

  // Step 1: Apply filters
  let filteredData = applyFilters(
    config.data,
    config.filters || [],
    config.dimensions,
  );

  // Step 1.5: If there's a zoom path, filter data to match the path
  if (zoomPath.length > 0) {
    filteredData = filteredData.filter((item) => {
      return zoomPath.every((pathItem) => {
        const dimension = config.dimensions.find(
          (d) => d.id === pathItem.dimensionId,
        );
        if (!dimension) return false;

        const itemValue = dimension.getValue(item);
        return itemValue === pathItem.dimensionValue;
      });
    });
  }

  // Step 2: Determine active measures
  const activeMeasures = config.activeMeasures
    ? config.measures.filter((m) => config.activeMeasures!.includes(m.id))
    : config.measures;

  // Step 4: Build groups
  let groups: CubeGroup[] = [];

  if (config.dimensions.length > 0) {
    if (zoomPath.length === 0) {
      // Normal mode: build from root - check for user override first
      let rootDimensionId: string | null = config.dimensions[0].id; // Default to first dimension

      // Check if user has overridden the root dimension
      if (config.nodeStates) {
        const rootState = config.nodeStates.get("");
        if (rootState?.childDimensionId !== undefined) {
          rootDimensionId = rootState.childDimensionId;
        }
      }

      // Only build groups if we have a valid dimension (not null)
      if (rootDimensionId !== null && rootDimensionId !== undefined) {
        groups = buildGroupsWithBreakdownMap(
          filteredData,
          rootDimensionId,
          config.nodeStates,
          config.dimensions,
          activeMeasures,
          "",
          maxDepth,
          0,
          includeItems,
          skipEmptyGroups,
          config.dimensions.map((d) => d.id),
          [], // Empty current path for root level
        );
      }
    } else {
      // Zoom mode: find what dimension to use for children of the zoomed node
      const zoomPathString = zoomPath
        .map((p) => {
          const dim = config.dimensions.find((d) => d.id === p.dimensionId);
          const key = dim?.getKey
            ? dim.getKey(p.dimensionValue)
            : String(p.dimensionValue ?? "null");
          return `${p.dimensionId}:${key}`;
        })
        .join("|");

      // Find the child dimension for this zoom path using node states
      const childDimensionId = findBreakdownDimensionId(
        zoomPathString,
        config.nodeStates,
        config.dimensions.map((d) => d.id),
      );

      // If we found a child dimension, build groups for it
      // If childDimensionId is null, don't build groups (raw data mode)
      if (childDimensionId) {
        groups = buildGroupsWithBreakdownMap(
          filteredData,
          childDimensionId,
          config.nodeStates,
          config.dimensions,
          activeMeasures,
          zoomPathString,
          maxDepth,
          zoomPath.length,
          includeItems,
          skipEmptyGroups,
          config.dimensions.map((d) => d.id),
          zoomPath, // Use zoom path as current path
        );
      }
      // If childDimensionId is null, groups remains empty (raw data mode)
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
    filteredData: includeItems ? filteredData : undefined,
    config: {
      ...config,
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
 * Calculate measurements for selected groups
 */
export function calculateMeasurementsForSelection<TData extends CubeDataItem>(
  groups: CubeGroup[],
  selectedGroupIds: string[],
  measures: MeasureDescriptor<TData, unknown>[],
): CubeCell[] {
  if (selectedGroupIds.length === 0) {
    return [];
  }

  // Filter groups to only selected ones
  const selectedGroups = groups.filter((group) =>
    selectedGroupIds.includes(group.dimensionKey),
  );

  if (selectedGroups.length === 0) {
    return [];
  }

  // Collect all items from selected groups
  const allItems: TData[] = [];
  selectedGroups.forEach((group) => {
    if (group.items) {
      allItems.push(...(group.items as TData[]));
    }
  });

  if (allItems.length === 0) {
    return [];
  }

  // Calculate measurements for all selected items
  return measures.map((measure) => {
    const values = allItems.map((item) => measure.getValue(item));
    const aggregatedValue = measure.aggregate?.(values) ?? 0;

    return {
      measureId: measure.id,
      value: aggregatedValue,
      formattedValue:
        measure.formatValue?.(aggregatedValue) ?? String(aggregatedValue),
    };
  });
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
  calculateMeasurementsForSelection: typeof calculateMeasurementsForSelection;
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
    calculateMeasurementsForSelection,
  };
}

// Export default service instance
export const cubeService = createCubeService();
