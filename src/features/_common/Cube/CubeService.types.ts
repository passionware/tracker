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

export function withDataType<TData extends CubeDataItem>() {
  return {
    createDimension: <TValue>(
      descriptor: DimensionDescriptor<TData, TValue>,
    ) => {
      return descriptor;
    },
    createMeasure: <TValue>(descriptor: MeasureDescriptor<TData, TValue>) => {
      return descriptor;
    },
  };
}

export type MeasureSidebarMode = "percentage" | "absolute" | "divergent";

export interface MeasureSidebarOptions {
  /**
   * Controls how this measure should be visualized in sidebar breakdown charts.
   * - percentage: show % of total with a single-direction progress bar
   * - absolute: show formatted absolute value in label; progress bar relative to max
   * - divergent: bipole bar with 0 baseline; negatives left, positives right
   */
  mode: MeasureSidebarMode;
  /** Optional custom colors for divergent mode */
  positiveColorClassName?: string;
  negativeColorClassName?: string;
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
  /** Sidebar visualization preferences */
  sidebarOptions?: MeasureSidebarOptions;
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
 * Per-node breakdown configuration
 * Maps a path to the dimension to use for that node's children
 */
export interface BreakdownMap {
  /** Key: path string (e.g., "region:North" or "region:North|category:Electronics") */
  /** Value: dimension ID to use for children, or null to show raw data */
  [path: string]: string | null;
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
  /** Per-node breakdown configuration - PRIMARY way to define hierarchies */
  breakdownMap?: BreakdownMap;
  /**
   * Initial dimension grouping sequence (e.g., ["project", "contractor", "task"])
   * This defines both the default breakdown hierarchy and the dimension priority order.
   * When no explicit breakdown is set, the system will use the next dimension in this sequence.
   */
  initialGrouping?: string[];
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
  /** Path to this node (for breakdown map lookup) */
  path?: string;
  /** Dimension ID used for this group's children (from breakdownMap), or null to show raw data */
  childDimensionId?: string | null;
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
  /** Filtered data items (for dimensional breakdowns in sidebar) */
  filteredData?: CubeDataItem[];
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
  /** Zoom path for filtering data to a specific node (for zoom functionality) */
  zoomPath?: Array<{ dimensionId: string; dimensionValue: unknown }>;
}
