/**
 * Generic Multidimensional Cube (BI) Service Types
 *
 * This module provides a type-safe, generic foundation for building
 * OLAP-style cubes for business intelligence and analytics.
 */

/**
 * Base type for any data item in the cube
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type CubeDataItem = Record<string, any>;

/**
 * Defines how to extract a dimension value from a data item
 */
export interface DimensionDescriptor<
  TData extends CubeDataItem,
  TValue = unknown,
> {
  /** Unique identifier for this dimension */
  id: string;
  /** Human-readable name */
  name: string;
  /** Optional description */
  description?: string;
  /** Extract the dimension value from a data item */
  getValue: (item: TData) => TValue;
  /** Format the value for display */
  formatValue?: (value: TValue) => string;
  /** Get a unique key for grouping (defaults to string conversion) */
  getKey?: (value: TValue) => string;
  /** Optional icon or emoji for UI */
  icon?: string;
}

/**
 * Defines how to calculate a measure/metric from data items
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface MeasureDescriptor<TData extends CubeDataItem, TValue = any> {
  /** Unique identifier for this measure */
  id: string;
  /** Human-readable name */
  name: string;
  /** Optional description */
  description?: string;
  /** Calculate the measure value from a single data item */
  getValue: (item: TData) => TValue;
  /** Aggregate multiple values into a single result */
  aggregate: (values: TValue[]) => TValue;
  /** Format the aggregated value for display */
  formatValue?: (value: TValue) => string;
  /** Optional icon or emoji for UI */
  icon?: string;
}

/**
 * Filter operator types
 */
export type FilterOperator =
  | "equals"
  | "notEquals"
  | "in"
  | "notIn"
  | "greaterThan"
  | "lessThan"
  | "greaterThanOrEqual"
  | "lessThanOrEqual"
  | "contains"
  | "startsWith"
  | "endsWith";

/**
 * A filter for a specific dimension
 */
export interface DimensionFilter<TValue = unknown> {
  dimensionId: string;
  operator: FilterOperator;
  value: TValue | TValue[];
}

/**
 * Configuration for cube calculation
 */
export interface CubeConfig<TData extends CubeDataItem> {
  /** The raw data to analyze */
  data: TData[];
  /** Available dimensions for grouping/filtering */
  dimensions: DimensionDescriptor<TData, unknown>[];
  /** Available measures to calculate */
  measures: MeasureDescriptor<TData, unknown>[];
  /** Active filters */
  filters?: DimensionFilter[];
  /** Dimensions to group by (in order) */
  groupBy?: string[]; // dimension IDs
  /** Measures to include in results */
  activeMeasures?: string[]; // measure IDs (defaults to all)
}

/**
 * A single cell in the cube result
 */
export interface CubeCell {
  measureId: string;
  value: unknown;
  formattedValue?: string;
}

/**
 * A group in the cube result (one level of the hierarchy)
 */
export interface CubeGroup {
  /** The dimension this group represents */
  dimensionId: string;
  /** The value for this group */
  dimensionValue: unknown;
  /** Display key for this group */
  dimensionKey: string;
  /** Formatted display value */
  dimensionLabel: string;
  /** Number of data items in this group */
  itemCount: number;
  /** Calculated measures for this group */
  cells: CubeCell[];
  /** Nested sub-groups (if multiple groupBy dimensions) */
  subGroups?: CubeGroup[];
  /** Reference to original data items (optional, for drill-through) */
  items?: CubeDataItem[];
}

/**
 * The complete cube result
 */
export interface CubeResult {
  /** Top-level groups */
  groups: CubeGroup[];
  /** Total number of items after filtering */
  totalItems: number;
  /** Grand total cells (aggregated across all groups) */
  grandTotals: CubeCell[];
  /** Applied configuration */
  config: CubeConfig<CubeDataItem>;
}

/**
 * Options for cube calculation
 */
export interface CubeCalculationOptions {
  /** Include original items in each group (for drill-through) */
  includeItems?: boolean;
  /** Maximum depth for grouping (prevents excessive nesting) */
  maxDepth?: number;
  /** Skip empty groups */
  skipEmptyGroups?: boolean;
}
