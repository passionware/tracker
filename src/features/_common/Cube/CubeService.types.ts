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
 * Sort direction for dimension values
 */
export type SortDirection = "asc" | "desc";

/**
 * Sorting option for a dimension
 */
export interface DimensionSortOption {
  /** Unique identifier for this sort option */
  id: string;
  /** Human-readable label for UI */
  label: string;
  /** Comparator function for sorting */
  comparator: (a: unknown, b: unknown) => number;
  /** Default direction for this sort option */
  defaultDirection?: SortDirection;
}

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
  /** Available sorting options for this dimension */
  sortOptions?: DimensionSortOption[];
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
  /** Available sorting options for this measure */
  sortOptions?: DimensionSortOption[];
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
 * Sorting state for a node
 */
export interface NodeSortState {
  /** Selected sort option ID */
  sortOptionId?: string;
  /** Sort direction */
  direction?: SortDirection;
}

/**
 * Configuration for cube calculation
 */
export interface CubeConfig<TData extends CubeDataItem> {
  /** The raw data to analyze */
  data: TData[];
  /** Available dimensions for grouping/filtering - order defines priority and default hierarchy */
  dimensions: DimensionDescriptor<TData, unknown>[];
  /** Available measures to calculate */
  measures: MeasureDescriptor<TData, unknown>[];
  /** Active filters */
  filters?: DimensionFilter[];
  /** Node states containing user overrides */
  nodeStates: Map<
    string,
    {
      isExpanded: boolean;
      childDimensionId?: string | null;
      sortState?: NodeSortState;
    }
  >;
  /** Initial dimension grouping sequence (derived from dimensions array order) */
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
