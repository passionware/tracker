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
  SerializableCubeState,
  SerializableDataItem,
  SerializableDimension,
  SerializableMeasure,
  SerializableFilter,
  SerializableDataField,
  SerializableDataType,
  SerializableFormatFunction,
  AggregationFunction,
  FormatFunctionRegistry,
  AggregationFunctionRegistry,
  DeserializationOptions,
} from "./CubeSerialization.types.ts";
import { sum } from "lodash";

/**
 * Default format function registry with common formatters
 */
export const defaultFormatFunctions: FormatFunctionRegistry = {
  currency: {
    format: (value: unknown, params?: Record<string, unknown>) => {
      const num = typeof value === "number" ? value : parseFloat(String(value));
      if (isNaN(num)) return String(value);
      const currency = (params?.currency as string) || "USD";
      const decimals = (params?.decimals as number) || 2;
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
      const decimals = (params?.decimals as number) || 2;
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
      const decimals = (params?.decimals as number) || 1;
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
 * Infer data type from a value
 */
function inferDataType(value: unknown): SerializableDataType {
  if (value === null || value === undefined) return "string";

  if (typeof value === "boolean") return "boolean";
  if (typeof value === "number") return "number";
  if (typeof value === "string") {
    // Try to detect date/datetime
    const date = new Date(value);
    if (!isNaN(date.getTime())) {
      // Check if it's just a date or includes time
      return value.includes("T") || value.includes(" ") ? "dateTime" : "date";
    }
    return "string";
  }

  if (value instanceof Date) return "dateTime";

  return "string";
}

/**
 * Analyze data to infer schema
 */
function inferDataSchema(data: CubeDataItem[]): SerializableDataField[] {
  if (data.length === 0) return [];

  const fieldTypes = new Map<string, Set<SerializableDataType>>();

  // Analyze all data items
  data.forEach((item) => {
    Object.entries(item).forEach(([key, value]) => {
      if (!fieldTypes.has(key)) {
        fieldTypes.set(key, new Set());
      }
      fieldTypes.get(key)!.add(inferDataType(value));
    });
  });

  // Convert to field definitions
  return Array.from(fieldTypes.entries()).map(([name, types]) => {
    // Choose the most specific type
    let type: SerializableDataType = "string";
    if (types.has("number")) type = "number";
    else if (types.has("boolean")) type = "boolean";
    else if (types.has("dateTime")) type = "dateTime";
    else if (types.has("date")) type = "date";
    else if (types.has("time")) type = "time";

    return {
      name,
      type,
      nullable: types.has("string") && types.size > 1, // Consider nullable if mixed with string
    };
  });
}

/**
 * Serialize a cube configuration to JSON-safe format
 */
export function serializeCubeConfig<TData extends CubeDataItem>(
  config: CubeConfig<TData>,
): SerializableCubeConfig {
  // Infer data schema from the data
  const dataSchema = {
    fields: inferDataSchema(config.data),
  };

  // Convert dimensions
  const dimensions: SerializableDimension[] = config.dimensions.map((dim) => {
    // Try to find the field name by analyzing the getValue function
    // This is a heuristic approach - in practice, you might want to store field names explicitly
    let fieldName = "unknown";

    // Simple heuristic: if getValue is a simple property access, extract the property name
    const getValueStr = dim.getValue.toString();
    const match = getValueStr.match(/item\.(\w+)/);
    if (match) {
      fieldName = match[1];
    }

    // Check if this dimension has labelMapping (from our custom serialization)
    const dimensionWithLabelMapping = dim as any;

    return {
      id: dim.id,
      name: dim.name,
      description: dim.description,
      icon: dim.icon,
      fieldName,
      keyFieldName: dim.getKey ? "custom" : undefined,
      // Use labelMapping if available, otherwise no formatFunction
      // Custom formatValue functions are not serializable
      labelMapping: dimensionWithLabelMapping.labelMapping,
      formatFunction: undefined, // Custom functions are not allowed in serialization
    };
  });

  // Convert measures
  const measures: SerializableMeasure[] = config.measures.map((measure) => {
    let fieldName = "unknown";
    let aggregationFunction: AggregationFunction = "sum";

    // Try to extract field name from getValue function
    const getValueStr = measure.getValue.toString();
    const match = getValueStr.match(/item\.(\w+)/);
    if (match) {
      fieldName = match[1];
    }

    // Try to determine aggregation function from the aggregate function
    const aggregateStr = measure.aggregate.toString();
    if (aggregateStr.includes("reduce") && aggregateStr.includes("+")) {
      aggregationFunction = "sum";
    } else if (aggregateStr.includes("length")) {
      aggregationFunction = "count";
    } else if (aggregateStr.includes("/")) {
      aggregationFunction = "average";
    } else if (aggregateStr.includes("Math.min")) {
      aggregationFunction = "min";
    } else if (aggregateStr.includes("Math.max")) {
      aggregationFunction = "max";
    }

    // For measures, we'll use built-in format functions instead of custom ones
    let formatFunction: SerializableFormatFunction | undefined;
    if (measure.formatValue) {
      const formatStr = measure.formatValue.toString();
      if (formatStr.includes("toFixed") && formatStr.includes("h")) {
        // Hours formatting
        formatFunction = {
          type: "number",
          parameters: { decimals: 2 },
        };
      } else if (formatStr.includes("$") && formatStr.includes("toFixed")) {
        // Currency formatting
        formatFunction = {
          type: "currency",
          parameters: { currency: "USD", decimals: 2 },
        };
      }
    }

    return {
      id: measure.id,
      name: measure.name,
      description: measure.description,
      icon: measure.icon,
      fieldName,
      aggregationFunction,
      formatFunction,
      sidebarOptions: measure.sidebarOptions,
    };
  });

  // Convert filters
  const filters: SerializableFilter[] = (config.filters || []).map(
    (filter) => ({
      dimensionId: filter.dimensionId,
      operator: filter.operator,
      value: filter.value,
    }),
  );

  // Check if config has listView (from our custom serialization)
  const configWithListView = config as any;

  return {
    metadata: {
      version: "1.0.0",
      createdAt: new Date().toISOString(),
      modifiedAt: new Date().toISOString(),
      name: "Cube Configuration",
    },
    dataSchema,
    dimensions,
    measures,
    breakdownMap: config.breakdownMap,
    initialGrouping: config.initialGrouping,
    activeMeasures: config.activeMeasures,
    filters,
    listView: configWithListView.listView,
  };
}

/**
 * Serialize a complete cube state (config + data)
 */
export function serializeCubeState<TData extends CubeDataItem>(
  config: CubeConfig<TData>,
): SerializableCubeState {
  const serializedConfig = serializeCubeConfig(config);

  return {
    config: serializedConfig,
    data: config.data as SerializableDataItem[],
  };
}

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
  const dimensions: DimensionDescriptor<TData, unknown>[] =
    serialized.dimensions.map((dim) => ({
      id: dim.id,
      name: dim.name,
      description: dim.description,
      icon: dim.icon,
      getValue: (item: TData) => {
        const value = item[dim.fieldName as keyof TData];
        return value;
      },
      formatValue: (value: unknown) => {
        // First check if we have label mapping for this value
        if (dim.labelMapping && dim.labelMapping[String(value)]) {
          return dim.labelMapping[String(value)];
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
    breakdownMap: serialized.breakdownMap,
    initialGrouping: serialized.initialGrouping,
    activeMeasures: serialized.activeMeasures,
  };
}

/**
 * Deserialize a complete cube state
 */
export function deserializeCubeState<TData extends CubeDataItem>(
  serialized: SerializableCubeState,
  options: DeserializationOptions = {},
): CubeConfig<TData> {
  return deserializeCubeConfig(
    serialized.config,
    serialized.data as TData[],
    options,
  );
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
    breakdownMap?: Record<string, string | null>;
    initialGrouping?: string[];
    activeMeasures?: string[];
    filters?: SerializableFilter[];
    isPreAggregated?: boolean;
    aggregationPeriod?: "day" | "week" | "month" | "quarter" | "year";
    description?: string;
  } = {},
): SerializableCubeConfig {
  return {
    metadata: {
      version: "1.0.0",
      createdAt: new Date().toISOString(),
      modifiedAt: new Date().toISOString(),
      name,
    },
    dataSchema: {
      fields: dataSchema,
    },
    dimensions,
    measures,
    breakdownMap: options.breakdownMap,
    initialGrouping: options.initialGrouping,
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
