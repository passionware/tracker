/**
 * Cube Configuration Serialization Service
 *
 * Provides functions to serialize and deserialize cube configurations to/from JSON
 * for database storage and restoration.
 */

import type {
  CubeConfig,
  DimensionDescriptor,
  MeasureDescriptor,
  DimensionFilter,
  CubeDataItem,
} from "../CubeService.types.ts";
import type {
  SerializableCubeConfig,
  SerializableDimension,
  SerializableMeasure,
  SerializableFilter,
  SerializableDataField,
  FormatFunctionRegistry,
  AggregationFunctionRegistry,
  DeserializationOptions,
} from "./CubeSerialization.types.ts";
import { sum } from "lodash";

// Constants
const CUBE_SERIALIZATION_VERSION = "1.0.0";
const DEFAULT_CURRENCY = "EUR";
const DEFAULT_DECIMALS = 2;
const DEFAULT_PERCENTAGE_DECIMALS = 1;

/**
 * Default format function registry with common formatters
 */
export const defaultFormatFunctions: FormatFunctionRegistry = {
  currency: {
    format: (value: unknown, params?: Record<string, unknown>) => {
      const num = typeof value === "number" ? value : parseFloat(String(value));
      if (isNaN(num)) return String(value);
      const currency = (params?.currency as string) || DEFAULT_CURRENCY;
      const decimals = (params?.decimals as number) || DEFAULT_DECIMALS;
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency,
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      }).format(num);
    },
    validate: (params?: Record<string, unknown>) => {
      return (
        typeof params?.currency === "string" &&
        typeof params?.decimals === "number"
      );
    },
  },
  number: {
    format: (value: unknown, params?: Record<string, unknown>) => {
      const num = typeof value === "number" ? value : parseFloat(String(value));
      if (isNaN(num)) return String(value);
      const decimals = (params?.decimals as number) || DEFAULT_DECIMALS;
      return num.toFixed(decimals);
    },
    validate: (params?: Record<string, unknown>) => {
      return typeof params?.decimals === "number";
    },
  },
  percentage: {
    format: (value: unknown, params?: Record<string, unknown>) => {
      const num = typeof value === "number" ? value : parseFloat(String(value));
      if (isNaN(num)) return String(value);
      const decimals =
        (params?.decimals as number) || DEFAULT_PERCENTAGE_DECIMALS;
      return `${(num * 100).toFixed(decimals)}%`;
    },
    validate: (params?: Record<string, unknown>) => {
      return typeof params?.decimals === "number";
    },
  },
  date: {
    format: (value: unknown, params?: Record<string, unknown>) => {
      if (!value) return "";
      const date = new Date(value as string | number | Date);
      if (isNaN(date.getTime())) return String(value);
      const format = (params?.format as string) || "short";
      return new Intl.DateTimeFormat("en-US", {
        dateStyle: format === "short" ? "short" : "long",
      }).format(date);
    },
    validate: (params?: Record<string, unknown>) => {
      return !params || typeof params?.format === "string";
    },
  },
  uppercase: {
    format: (value: unknown) => String(value).toUpperCase(),
  },
  lowercase: {
    format: (value: unknown) => String(value).toLowerCase(),
  },
};

/**
 * Default aggregation function registry
 */
export const defaultAggregationFunctions: AggregationFunctionRegistry = {
  sum: {
    aggregate: (values: unknown[]) => {
      const nums = values
        .map((v) => (typeof v === "number" ? v : parseFloat(String(v))))
        .filter((v) => !isNaN(v));
      return sum(nums);
    },
  },
  count: {
    aggregate: (values: unknown[]) => values.length,
  },
  average: {
    aggregate: (values: unknown[]) => {
      const nums = values
        .map((v) => (typeof v === "number" ? v : parseFloat(String(v))))
        .filter((v) => !isNaN(v));
      return nums.length > 0 ? sum(nums) / nums.length : 0;
    },
  },
  min: {
    aggregate: (values: unknown[]) => {
      const nums = values
        .map((v) => (typeof v === "number" ? v : parseFloat(String(v))))
        .filter((v) => !isNaN(v));
      return nums.length > 0 ? Math.min(...nums) : 0;
    },
  },
  max: {
    aggregate: (values: unknown[]) => {
      const nums = values
        .map((v) => (typeof v === "number" ? v : parseFloat(String(v))))
        .filter((v) => !isNaN(v));
      return nums.length > 0 ? Math.max(...nums) : 0;
    },
  },
  first: {
    aggregate: (values: unknown[]) => values[0],
  },
  last: {
    aggregate: (values: unknown[]) => values[values.length - 1],
  },
  distinctCount: {
    aggregate: (values: unknown[]) => new Set(values).size,
  },
};

/**
 * Deserialize a cube configuration from JSON
 */
export function deserializeCubeConfig<TData extends CubeDataItem>(
  serialized: SerializableCubeConfig,
  data: TData[],
  options: DeserializationOptions = {},
): CubeConfig<TData> {
  const {
    formatFunctions = defaultFormatFunctions,
    aggregationFunctions = defaultAggregationFunctions,
  } = options;

  // Convert dimensions
  const dimensions: DimensionDescriptor<TData, unknown>[] = (
    serialized.dimensions || []
  ).map((dim) => ({
    id: dim.id,
    name: dim.name,
    description: dim.description,
    icon: dim.icon,
    getValue: (item: TData) => {
      const value = item[dim.fieldName as keyof TData];
      return value;
    },
    formatValue: (value: unknown) => {
      // Check if we have label mapping for this value
      if (dim.labelMapping) {
        const mappedValue = dim.labelMapping[String(value)];
        if (mappedValue !== undefined) {
          return mappedValue;
        }
      }

      // Then check for built-in format function
      if (dim.formatFunction) {
        const formatter = formatFunctions[dim.formatFunction.type];
        if (formatter) {
          return formatter.format(value, dim.formatFunction.parameters);
        }
      }

      // Fallback to string representation
      return String(value);
    },
    getKey:
      dim.keyFieldName && dim.keyFieldName !== "custom"
        ? (value: unknown) => String((value as any)?.[dim.keyFieldName!])
        : undefined,
  }));

  // Convert measures
  const measures: MeasureDescriptor<TData, unknown>[] = serialized.measures.map(
    (measure) => {
      const aggregator = aggregationFunctions[measure.aggregationFunction];
      if (!aggregator) {
        throw new Error(
          `Unknown aggregation function: ${measure.aggregationFunction}`,
        );
      }

      return {
        id: measure.id,
        name: measure.name,
        description: measure.description,
        icon: measure.icon,
        getValue: (item: TData) => {
          const value = item[measure.fieldName as keyof TData];
          return value;
        },
        aggregate: aggregator.aggregate,
        formatValue: measure.formatFunction
          ? (value: unknown) => {
              const formatter = formatFunctions[measure.formatFunction!.type];
              if (formatter) {
                return formatter.format(
                  value,
                  measure.formatFunction!.parameters,
                );
              }
              return String(value);
            }
          : undefined,
        sidebarOptions: measure.sidebarOptions,
      };
    },
  );

  // Convert filters
  const filters: DimensionFilter[] = (serialized.filters || []).map(
    (filter) => ({
      dimensionId: filter.dimensionId,
      operator: filter.operator,
      value: filter.value,
    }),
  );

  return {
    data,
    dimensions,
    measures,
    filters,
    activeMeasures: serialized.activeMeasures,
    nodeStates: new Map(),
  };
}

/**
 * Create a serializable cube configuration from scratch
 */
export function createSerializableCubeConfig(
  name: string,
  dataSchema: SerializableDataField[],
  dimensions: SerializableDimension[],
  measures: SerializableMeasure[],
  options: {
    activeMeasures?: string[];
    filters?: SerializableFilter[];
    isPreAggregated?: boolean;
    aggregationPeriod?: "day" | "week" | "month" | "quarter" | "year";
    description?: string;
  } = {},
): SerializableCubeConfig {
  return {
    metadata: {
      version: CUBE_SERIALIZATION_VERSION,
      createdAt: new Date().toISOString(),
      modifiedAt: new Date().toISOString(),
      name,
    },
    dataSchema: {
      fields: dataSchema,
    },
    dimensions,
    measures,
    activeMeasures: options.activeMeasures,
    filters: options.filters,
  };
}

/**
 * Validate a serializable cube configuration
 */
export function validateSerializableCubeConfig(
  config: SerializableCubeConfig,
): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Check metadata
  if (!config.metadata?.version) {
    errors.push("Missing metadata.version");
  }
  if (!config.metadata?.name) {
    errors.push("Missing metadata.name");
  }

  // Check data schema
  if (!config.dataSchema?.fields || config.dataSchema.fields.length === 0) {
    errors.push("Missing or empty dataSchema.fields");
  }

  // Check dimensions
  if (!config.dimensions || config.dimensions.length === 0) {
    errors.push("Missing or empty dimensions");
  } else {
    config.dimensions.forEach((dim, index) => {
      if (!dim.id) errors.push(`Dimension ${index}: missing id`);
      if (!dim.name) errors.push(`Dimension ${index}: missing name`);
      if (!dim.fieldName) errors.push(`Dimension ${index}: missing fieldName`);
    });
  }

  // Check measures
  if (!config.measures || config.measures.length === 0) {
    errors.push("Missing or empty measures");
  } else {
    config.measures.forEach((measure, index) => {
      if (!measure.id) errors.push(`Measure ${index}: missing id`);
      if (!measure.name) errors.push(`Measure ${index}: missing name`);
      if (!measure.fieldName)
        errors.push(`Measure ${index}: missing fieldName`);
      if (!measure.aggregationFunction) {
        errors.push(`Measure ${index}: missing aggregationFunction`);
      }
    });
  }

  // Check that all dimension and measure field names exist in data schema
  const fieldNames = new Set(config.dataSchema.fields.map((f) => f.name));

  config.dimensions.forEach((dim, index) => {
    if (!fieldNames.has(dim.fieldName)) {
      errors.push(
        `Dimension ${index}: fieldName '${dim.fieldName}' not found in data schema`,
      );
    }
  });

  config.measures.forEach((measure, index) => {
    if (!fieldNames.has(measure.fieldName)) {
      errors.push(
        `Measure ${index}: fieldName '${measure.fieldName}' not found in data schema`,
      );
    }
  });

  return {
    valid: errors.length === 0,
    errors,
  };
}
