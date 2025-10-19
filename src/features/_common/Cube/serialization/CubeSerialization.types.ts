/**
 * Serializable Cube Configuration Types
 *
 * This module defines types for serializing and deserializing cube configurations
 * to/from JSON format for database storage and restoration.
 */

import type { BreakdownMap } from "../CubeService.types.ts";

/**
 * Supported data types for serialization
 */
export type SerializableDataType =
  | "string"
  | "number"
  | "boolean"
  | "date"
  | "dateTime"
  | "time";

/**
 * Aggregation function types for measures
 */
export type AggregationFunction =
  | "sum"
  | "count"
  | "average"
  | "min"
  | "max"
  | "first"
  | "last"
  | "distinctCount";

/**
 * ListView column types for raw data display
 */
export type ListViewColumnType =
  | "text"
  | "number"
  | "date"
  | "boolean"
  | "currency"
  | "percentage";

/**
 * ListView column definition for serializable configuration
 */
export interface SerializableListViewColumn {
  /** Column identifier */
  id: string;
  /** Display name for the column header */
  name: string;
  /** Field name in the data */
  fieldName: string;
  /** Column type for formatting */
  type: ListViewColumnType;
  /** Optional description */
  description?: string;
  /** Whether this column is sortable */
  sortable?: boolean;
  /** Whether this column is visible by default */
  visible?: boolean;
  /** Column width (CSS value) */
  width?: string;
  /** Format function for custom formatting */
  formatFunction?: SerializableFormatFunction;
}

/**
 * Data field definition for serializable configuration
 */
export interface SerializableDataField {
  /** Field name in the data */
  name: string;
  /** Data type of the field */
  type: SerializableDataType;
  /** Optional description */
  description?: string;
  /** Whether this field can be null/undefined */
  nullable?: boolean;
  /** Default value if null/undefined */
  defaultValue?: unknown;
}

/**
 * Serializable dimension definition
 */
export interface SerializableDimension {
  /** Unique identifier */
  id: string;
  /** Human-readable name */
  name: string;
  /** Optional description */
  description?: string;
  /** Optional icon */
  icon?: string;
  /** Field name to extract value from */
  fieldName: string;
  /** Optional custom key field (for grouping) */
  keyFieldName?: string;
  /** Format function configuration */
  formatFunction?: SerializableFormatFunction;
  /** Label resolution mapping for ID-based dimensions */
  labelMapping?: Record<string, string>;
}

/**
 * Serializable measure definition
 */
export interface SerializableMeasure {
  /** Unique identifier */
  id: string;
  /** Human-readable name */
  name: string;
  /** Optional description */
  description?: string;
  /** Optional icon */
  icon?: string;
  /** Field name to extract value from */
  fieldName: string;
  /** Aggregation function to use */
  aggregationFunction: AggregationFunction;
  /** Format function configuration */
  formatFunction?: SerializableFormatFunction;
  /** Sidebar visualization options */
  sidebarOptions?: {
    mode: "percentage" | "absolute" | "divergent";
    positiveColorClassName?: string;
    negativeColorClassName?: string;
  };
}

/**
 * Serializable format function configuration
 */
export interface SerializableFormatFunction {
  /** Function type identifier */
  type: string;
  /** Function parameters as key-value pairs */
  parameters?: Record<string, unknown>;
}

/**
 * Serializable filter definition
 */
export interface SerializableFilter {
  /** Dimension ID to filter on */
  dimensionId: string;
  /** Filter operator */
  operator:
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
  /** Filter value(s) */
  value: unknown | unknown[];
}

/**
 * Complete serializable cube configuration
 */
export interface SerializableCubeConfig {
  /** Configuration metadata */
  metadata: {
    /** Configuration version for compatibility */
    version: string;
    /** Creation timestamp */
    createdAt: string;
    /** Last modified timestamp */
    modifiedAt: string;
    /** Optional description of this configuration */
    description?: string;
    /** Configuration name */
    name: string;
  };
  /** Data schema definition */
  dataSchema: {
    /** List of data fields and their types */
    fields: SerializableDataField[];
  };
  /** Dimension definitions */
  dimensions: SerializableDimension[];
  /** Measure definitions */
  measures: SerializableMeasure[];
  /** Breakdown map for hierarchical grouping */
  breakdownMap?: BreakdownMap;
  /** Default dimension sequence (legacy support) */
  defaultDimensionSequence?: string[];
  /** Active measures to include */
  activeMeasures?: string[];
  /** Active filters */
  filters?: SerializableFilter[];
  /** ListView configuration for raw data display */
  listView?: {
    /** Column definitions for the ListView */
    columns: SerializableListViewColumn[];
    /** Maximum number of items to show initially */
    maxInitialItems?: number;
    /** Enable pagination */
    enablePagination?: boolean;
    /** Items per page */
    itemsPerPage?: number;
    /** Enable search functionality */
    enableSearch?: boolean;
  };
}

/**
 * Raw data item that can be serialized/deserialized
 */
export interface SerializableDataItem {
  [key: string]: unknown;
}

/**
 * Complete serializable cube state
 */
export interface SerializableCubeState {
  /** The cube configuration */
  config: SerializableCubeConfig;
  /** The raw data items */
  data: SerializableDataItem[];
}

/**
 * Format function registry for custom formatters
 */
export interface FormatFunctionRegistry {
  [functionType: string]: {
    format: (value: unknown, parameters?: Record<string, unknown>) => string;
    validate?: (parameters?: Record<string, unknown>) => boolean;
  };
}

/**
 * Aggregation function registry
 */
export interface AggregationFunctionRegistry {
  [functionType: string]: {
    aggregate: (values: unknown[]) => unknown;
    validate?: (values: unknown[]) => boolean;
  };
}

/**
 * Options for serialization
 */
export interface SerializationOptions {
  /** Include raw data in serialization */
  includeData?: boolean;
  /** Compress the serialized data */
  compress?: boolean;
  /** Custom format function registry */
  formatFunctions?: FormatFunctionRegistry;
  /** Custom aggregation function registry */
  aggregationFunctions?: AggregationFunctionRegistry;
}

/**
 * Options for deserialization
 */
export interface DeserializationOptions {
  /** Custom format function registry */
  formatFunctions?: FormatFunctionRegistry;
  /** Custom aggregation function registry */
  aggregationFunctions?: AggregationFunctionRegistry;
  /** Data validation options */
  validateData?: boolean;
  /** Strict mode - fail on unknown properties */
  strict?: boolean;
}
