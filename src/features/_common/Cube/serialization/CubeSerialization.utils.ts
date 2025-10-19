/**
 * Utility functions for cube serialization
 *
 * Provides helper functions for working with serialized cube configurations,
 * data type conversion, and pre-aggregated data scenarios.
 */

import type {
  SerializableDataField,
  SerializableDataType,
  SerializableDataItem,
  SerializableCubeConfig,
  AggregationFunction,
} from "./CubeSerialization.types.ts";

/**
 * Create a simple data schema for any type of data
 */
export function createDataSchema(
  fields: Array<{
    name: string;
    type: SerializableDataType;
    description?: string;
    nullable?: boolean;
  }>,
): { fields: SerializableDataField[] } {
  return {
    fields: fields.map((field) => ({
      name: field.name,
      type: field.type,
      description: field.description || `${field.name} field`,
      nullable: field.nullable ?? false,
    })),
  };
}

/**
 * Create a dimension with label mapping for ID-based fields
 */
export function createDimensionWithLabels(
  id: string,
  name: string,
  fieldName: string,
  labelMapping: Record<string, string>,
  options?: {
    description?: string;
    icon?: string;
  },
) {
  return {
    id,
    name,
    fieldName,
    labelMapping,
    description: options?.description,
    icon: options?.icon,
  };
}

/**
 * Convert a value to a specific data type
 */
export function convertToDataType(
  value: unknown,
  targetType: SerializableDataType,
  options: {
    nullable?: boolean;
    defaultValue?: unknown;
  } = {},
): unknown {
  if (value === null || value === undefined) {
    if (options.nullable) return null;
    return options.defaultValue ?? getDefaultValue(targetType);
  }

  switch (targetType) {
    case "string":
      return String(value);

    case "number":
      const num = typeof value === "number" ? value : parseFloat(String(value));
      return isNaN(num) ? ((options.defaultValue as number) ?? 0) : num;

    case "boolean":
      if (typeof value === "boolean") return value;
      if (typeof value === "string") {
        return value.toLowerCase() === "true" || value === "1";
      }
      return Boolean(value);

    case "date":
      if (value instanceof Date) return value;
      const date = new Date(value as string);
      return isNaN(date.getTime()) ? new Date() : date;

    case "dateTime":
      if (value instanceof Date) return value;
      const dateTime = new Date(value as string);
      return isNaN(dateTime.getTime()) ? new Date() : dateTime;

    case "time":
      // For time, we'll store as string in HH:mm:ss format
      if (typeof value === "string") return value;
      if (value instanceof Date) {
        return value.toTimeString().split(" ")[0];
      }
      return String(value);

    default:
      return value;
  }
}

/**
 * Get default value for a data type
 */
export function getDefaultValue(type: SerializableDataType): unknown {
  switch (type) {
    case "string":
      return "";
    case "number":
      return 0;
    case "boolean":
      return false;
    case "date":
      return new Date();
    case "dateTime":
      return new Date();
    case "time":
      return "00:00:00";
    default:
      return null;
  }
}

/**
 * Validate a data item against a schema
 */
export function validateDataItem(
  item: SerializableDataItem,
  schema: SerializableDataField[],
  options: {
    strict?: boolean;
    convertTypes?: boolean;
  } = {},
): {
  valid: boolean;
  errors: string[];
  convertedItem?: SerializableDataItem;
} {
  const errors: string[] = [];
  const convertedItem: SerializableDataItem = {};

  const fieldMap = new Map(schema.map((f) => [f.name, f]));

  // Check all schema fields
  schema.forEach((field) => {
    const value = item[field.name];

    if (value === undefined || value === null) {
      if (!field.nullable) {
        errors.push(`Field '${field.name}' is required but missing`);
      }
      convertedItem[field.name] =
        field.defaultValue ?? getDefaultValue(field.type);
    } else {
      if (options.convertTypes) {
        convertedItem[field.name] = convertToDataType(value, field.type, {
          nullable: field.nullable,
          defaultValue: field.defaultValue,
        });
      } else {
        convertedItem[field.name] = value;
      }
    }
  });

  // In strict mode, check for extra fields
  if (options.strict) {
    Object.keys(item).forEach((key) => {
      if (!fieldMap.has(key)) {
        errors.push(`Unexpected field '${key}' found in data`);
      }
    });
  } else {
    // In non-strict mode, copy extra fields as-is
    Object.keys(item).forEach((key) => {
      if (!fieldMap.has(key)) {
        convertedItem[key] = item[key];
      }
    });
  }

  return {
    valid: errors.length === 0,
    errors,
    convertedItem: options.convertTypes ? convertedItem : undefined,
  };
}

/**
 * Convert data items to match a schema
 */
export function convertDataToSchema(
  data: SerializableDataItem[],
  schema: SerializableDataField[],
  options: {
    strict?: boolean;
    validate?: boolean;
  } = {},
): {
  convertedData: SerializableDataItem[];
  errors: Array<{ index: number; errors: string[] }>;
} {
  const convertedData: SerializableDataItem[] = [];
  const errors: Array<{ index: number; errors: string[] }> = [];

  data.forEach((item, index) => {
    const result = validateDataItem(item, schema, {
      strict: options.strict,
      convertTypes: true,
    });

    if (!result.valid && options.validate) {
      errors.push({ index, errors: result.errors });
    }

    convertedData.push(result.convertedItem || item);
  });

  return { convertedData, errors };
}

/**
 * Create a schema for pre-aggregated time data
 */
export function createPreAggregatedTimeSchema(
  baseFields: SerializableDataField[],
  options: {
    dateField?: string;
    timeField?: string;
    aggregationPeriod?: "day" | "week" | "month" | "quarter" | "year";
  } = {},
): SerializableDataField[] {
  const schema = [...baseFields];

  // Add or update date field
  const dateFieldName = options.dateField || "date";
  const dateFieldIndex = schema.findIndex((f) => f.name === dateFieldName);
  const dateField: SerializableDataField = {
    name: dateFieldName,
    type: "date",
    description: `Date for ${options.aggregationPeriod || "day"} aggregation`,
    nullable: false,
  };

  if (dateFieldIndex >= 0) {
    schema[dateFieldIndex] = dateField;
  } else {
    schema.push(dateField);
  }

  // Add time field if specified
  if (options.timeField) {
    const timeFieldIndex = schema.findIndex(
      (f) => f.name === options.timeField,
    );
    const timeField: SerializableDataField = {
      name: options.timeField,
      type: "time",
      description: "Time of day",
      nullable: true,
    };

    if (timeFieldIndex >= 0) {
      schema[timeFieldIndex] = timeField;
    } else {
      schema.push(timeField);
    }
  }

  return schema;
}

/**
 * Create measures for pre-aggregated data
 */
export function createPreAggregatedMeasures(
  baseMeasures: Array<{
    id: string;
    name: string;
    fieldName: string;
    aggregationFunction?: AggregationFunction;
  }>,
  options: {
    addCountMeasure?: boolean;
    addHourMeasure?: boolean;
    countFieldName?: string;
    hourFieldName?: string;
  } = {},
): Array<{
  id: string;
  name: string;
  fieldName: string;
  aggregationFunction: AggregationFunction;
  description?: string;
}> {
  const measures = baseMeasures.map((m) => ({
    id: m.id,
    name: m.name,
    fieldName: m.fieldName,
    aggregationFunction: m.aggregationFunction || "sum",
    description: `Pre-aggregated ${m.name.toLowerCase()}`,
  }));

  // Add count measure if requested
  if (options.addCountMeasure) {
    measures.push({
      id: "count",
      name: "Count",
      fieldName: options.countFieldName || "count",
      aggregationFunction: "sum",
      description: "Total number of records",
    });
  }

  // Add hour measure if requested (for time tracking scenarios)
  if (options.addHourMeasure) {
    measures.push({
      id: "totalHours",
      name: "Total Hours",
      fieldName: options.hourFieldName || "numHours",
      aggregationFunction: "sum",
      description: "Total hours worked/tracked",
    });
  }

  return measures;
}

/**
 * Create dimensions for pre-aggregated time data
 */
export function createPreAggregatedTimeDimensions(
  baseDimensions: Array<{
    id: string;
    name: string;
    fieldName: string;
  }>,
  options: {
    addDateDimension?: boolean;
    addTimeDimension?: boolean;
    dateFieldName?: string;
    timeFieldName?: string;
    aggregationPeriod?: "day" | "week" | "month" | "quarter" | "year";
  } = {},
): Array<{
  id: string;
  name: string;
  fieldName: string;
  description?: string;
}> {
  const dimensions = baseDimensions.map((d) => ({
    id: d.id,
    name: d.name,
    fieldName: d.fieldName,
  }));

  // Add date dimension
  if (options.addDateDimension !== false) {
    dimensions.push({
      id: "date",
      name: "Date",
      fieldName: options.dateFieldName || "date",
    });
  }

  // Add time dimension if specified
  if (options.addTimeDimension && options.timeFieldName) {
    dimensions.push({
      id: "time",
      name: "Time",
      fieldName: options.timeFieldName,
    });
  }

  return dimensions;
}

/**
 * Example: Create a serializable configuration for time tracking data
 */
export function createTimeTrackingCubeConfig(
  options: {
    name?: string;
    includeProjects?: boolean;
    includeCategories?: boolean;
    includeContractors?: boolean;
    aggregationPeriod?: "day" | "week" | "month";
  } = {},
): SerializableCubeConfig {
  const {
    name = "Time Tracking Cube",
    includeProjects = true,
    includeCategories = true,
    includeContractors = true,
    aggregationPeriod = "day",
  } = options;

  // Define data schema
  const dataSchema: SerializableDataField[] = [
    {
      name: "date",
      type: "date",
      description: `Date for ${aggregationPeriod} aggregation`,
      nullable: false,
    },
    {
      name: "numHours",
      type: "number",
      description: "Number of hours tracked",
      nullable: false,
      defaultValue: 0,
    },
    {
      name: "count",
      type: "number",
      description: "Number of time entries",
      nullable: false,
      defaultValue: 0,
    },
  ];

  // Add optional fields
  if (includeProjects) {
    dataSchema.push({
      name: "projectId",
      type: "string",
      description: "Project identifier",
      nullable: true,
    });
    dataSchema.push({
      name: "projectName",
      type: "string",
      description: "Project name",
      nullable: true,
    });
  }

  if (includeCategories) {
    dataSchema.push({
      name: "categoryId",
      type: "string",
      description: "Category identifier",
      nullable: true,
    });
    dataSchema.push({
      name: "categoryName",
      type: "string",
      description: "Category name",
      nullable: true,
    });
  }

  if (includeContractors) {
    dataSchema.push({
      name: "contractorId",
      type: "string",
      description: "Contractor identifier",
      nullable: true,
    });
    dataSchema.push({
      name: "contractorName",
      type: "string",
      description: "Contractor name",
      nullable: true,
    });
  }

  // Create dimensions
  const dimensions = createPreAggregatedTimeDimensions([], {
    addDateDimension: true,
    dateFieldName: "date",
    aggregationPeriod,
  });

  if (includeProjects) {
    dimensions.push({
      id: "project",
      name: "Project",
      fieldName: "projectName",
      description: "Project name",
    });
  }

  if (includeCategories) {
    dimensions.push({
      id: "category",
      name: "Category",
      fieldName: "categoryName",
      description: "Category name",
    });
  }

  if (includeContractors) {
    dimensions.push({
      id: "contractor",
      name: "Contractor",
      fieldName: "contractorName",
      description: "Contractor name",
    });
  }

  // Create measures
  const measures = createPreAggregatedMeasures([], {
    addHourMeasure: true,
    addCountMeasure: true,
    hourFieldName: "numHours",
    countFieldName: "count",
  });

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
    breakdownMap: {
      "": includeProjects ? "project" : "date",
      ...(includeProjects && includeCategories
        ? {
            "project:*": "category",
          }
        : {}),
    },
    defaultDimensionSequence: [
      ...(includeProjects ? ["project"] : []),
      ...(includeCategories ? ["category"] : []),
      ...(includeContractors ? ["contractor"] : []),
      "date",
    ],
    activeMeasures: ["totalHours", "count"],
  };
}

/**
 * Helper to create sample pre-aggregated time tracking data
 */
export function createSampleTimeTrackingData(
  days: number = 30,
  options: {
    includeProjects?: boolean;
    includeCategories?: boolean;
    includeContractors?: boolean;
  } = {},
): SerializableDataItem[] {
  const data: SerializableDataItem[] = [];
  const projects = ["Project Alpha", "Project Beta", "Project Gamma"];
  const categories = ["Development", "Testing", "Design", "Planning"];
  const contractors = ["John Doe", "Jane Smith", "Bob Johnson"];

  const {
    includeProjects = true,
    includeCategories = true,
    includeContractors = true,
  } = options;

  for (let i = 0; i < days; i++) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split("T")[0];

    // Create multiple entries per day for different combinations
    const maxEntries = Math.max(1, Math.floor(Math.random() * 5) + 1);

    for (let j = 0; j < maxEntries; j++) {
      const entry: SerializableDataItem = {
        date: dateStr,
        numHours: Math.round((Math.random() * 8 + 0.5) * 100) / 100, // 0.5 to 8.5 hours
        count: 1,
      };

      if (includeProjects) {
        entry.projectId = `project_${(j % projects.length) + 1}`;
        entry.projectName = projects[j % projects.length];
      }

      if (includeCategories) {
        entry.categoryId = `category_${(j % categories.length) + 1}`;
        entry.categoryName = categories[j % categories.length];
      }

      if (includeContractors) {
        entry.contractorId = `contractor_${(j % contractors.length) + 1}`;
        entry.contractorName = contractors[j % contractors.length];
      }

      data.push(entry);
    }
  }

  return data;
}
