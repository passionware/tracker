/**
 * Stateless Cube Calculation Functions
 *
 * Pure functions for calculating cube data without state management.
 * Perfect for PDF generation and other stateless use cases.
 */

import type {
  CubeDataItem,
  DimensionDescriptor,
  MeasureDescriptor,
  CubeGroup,
  CubeCell,
} from "./CubeService.types";

/**
 * Path item representing a dimension value in the hierarchy
 */
export interface CalculationPathItem {
  dimensionId: string;
  dimensionValue: unknown;
}

/**
 * Options for cube calculation
 */
export interface CubeCalculationOptions {
  includeItems?: boolean;
  maxDepth?: number;
  skipEmptyGroups?: boolean;
}

/**
 * Calculate measures for a set of data items
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
 * Filter data items based on a path
 */
function filterDataByPath<TData extends CubeDataItem>(
  data: TData[],
  path: CalculationPathItem[],
  dimensions: DimensionDescriptor<TData, unknown>[],
): TData[] {
  if (path.length === 0) return data;

  return data.filter((item) => {
    return path.every((pathItem) => {
      const dimension = dimensions.find((d) => d.id === pathItem.dimensionId);
      if (!dimension) return false;

      const itemValue = dimension.getValue(item);
      const pathValue = pathItem.dimensionValue;

      // Compare using dimension's getKey if available
      const itemKey = dimension.getKey
        ? dimension.getKey(itemValue)
        : String(itemValue);
      const pathKey = dimension.getKey
        ? dimension.getKey(pathValue)
        : String(pathValue);

      return itemKey === pathKey;
    });
  });
}

/**
 * Calculate cube groups for a specific path and dimension
 */
export function calculateCubeGroups<TData extends CubeDataItem>(
  data: TData[],
  path: CalculationPathItem[],
  dimensionId: string,
  dimensions: DimensionDescriptor<TData, unknown>[],
  measures: MeasureDescriptor<TData, unknown>[],
  options: CubeCalculationOptions = {},
): CubeGroup[] {
  const { includeItems = false, skipEmptyGroups = false } = options;

  // Filter data to match the current path
  const filteredData = filterDataByPath(data, path, dimensions);

  // Find the dimension descriptor
  const dimension = dimensions.find((d) => d.id === dimensionId);
  if (!dimension) {
    console.warn(`Dimension ${dimensionId} not found`);
    return [];
  }

  // Group data by dimension value
  const grouped = new Map<string, TData[]>();
  filteredData.forEach((item) => {
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
    const nodePath =
      path.length > 0
        ? `${path.map((p) => `${p.dimensionId}:${p.dimensionValue}`).join("|")}|${dimensionId}:${key}`
        : `${dimensionId}:${key}`;

    const cells = calculateMeasures(items, measures);

    groups.push({
      dimensionId,
      dimensionValue: firstValue,
      dimensionKey: key,
      dimensionLabel: label,
      itemCount: items.length,
      cells,
      items: includeItems ? items : undefined,
      path: nodePath,
    });
  });

  return groups;
}
