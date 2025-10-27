# Cube Serialization System

A comprehensive serialization layer for the Cube system that allows storing and restoring entire cube configurations as JSON for database persistence and sharing.

## Overview

The serialization system provides:

- **JSON-safe serialization** of cube configurations
- **Database storage** of complete cube definitions
- **Flexible data schema** supporting any data structure
- **ID-based dimensions** with label mapping for database scenarios
- **Type validation** and data conversion
- **Format function registry** for custom value formatting
- **Aggregation function registry** for custom calculations

## Key Features

### 1. Serializable Configuration Types

All cube components can be serialized to JSON-safe format:

```typescript
interface SerializableCubeConfig {
  metadata: {
    version: string;
    createdAt: string;
    modifiedAt: string;
    name: string;
    description?: string;
  };
  dataSchema: {
    fields: SerializableDataField[];
  };
  dimensions: SerializableDimension[];
  measures: SerializableMeasure[];
  breakdownMap?: BreakdownMap;
  filters?: SerializableFilter[];
}
```

### 2. Flexible Data Schema

Support for any data structure without rigid constraints:

```typescript
// Simple data schema - just define the fields you need
const dataSchema = {
  fields: [
    { name: "date", type: "date", description: "Work date", nullable: false },
    {
      name: "numHours",
      type: "number",
      description: "Hours worked",
      nullable: false,
    },
    {
      name: "projectName",
      type: "string",
      description: "Project name",
      nullable: false,
    },
  ],
};
```

### 3. ID-Based Dimensions with Label Mapping

Perfect for database scenarios where you have foreign keys but want to display human-readable labels:

```typescript
const dimension = {
  id: "contractor",
  name: "Contractor",
  fieldName: "contractorId", // Database field with ID
  labelMapping: {
    "1": "Passionware Adam Borowski",
    "2": "Adam Witzberg",
    "3": "John Doe",
  },
};
```

### 4. Data Type Safety

Support for multiple data types with automatic conversion:

- `string`, `number`, `boolean`
- `date`, `dateTime`, `time`
- Automatic type inference from data
- Validation and conversion utilities

## Usage Examples

### Basic Serialization

```typescript
import {
  deserializeCubeConfig,
  createSerializableCubeConfig,
} from "./CubeSerialization";

// Get serializable configuration (source of truth)
const serializableConfig = createSerializableCubeConfig(data);

// Store in database
await database.store("cube_config", serializableConfig);

// Restore from database and convert to runtime config
const restored = await database.retrieve("cube_config");
const cubeConfig = deserializeCubeConfig(restored, data);
```

### Time Tracking with Simple Schema

```typescript
import {
  createDataSchema,
  createDimensionWithLabels,
} from "./CubeSerialization.utils";

// Create simple data schema
const dataSchema = createDataSchema([
  { name: "date", type: "date", description: "Work date" },
  { name: "numHours", type: "number", description: "Hours worked" },
  { name: "projectName", type: "string", description: "Project name" },
  { name: "contractorName", type: "string", description: "Contractor name" },
]);

// Create dimensions with ID-based mapping
const dimensions = [
  createDimensionWithLabels("contractor", "Contractor", "contractorId", {
    "1": "Passionware Adam Borowski",
    "2": "Adam Witzberg",
  }),
];

// Create working cube configuration
const cubeConfig = deserializeCubeConfig(serializedConfig, data);
```

### Custom Analytics Schema

```typescript
// Define custom schema for website analytics
const dataSchema = createDataSchema([
  { name: "date", type: "date", description: "Analytics date" },
  { name: "pageViews", type: "number", description: "Page view count" },
  {
    name: "uniqueVisitors",
    type: "number",
    description: "Unique visitor count",
  },
  { name: "deviceType", type: "string", description: "Device type" },
]);

const dimensions = [
  {
    id: "date",
    name: "Date",
    fieldName: "date",
    formatFunction: { type: "date", parameters: { format: "short" } },
  },
  {
    id: "deviceType",
    name: "Device Type",
    fieldName: "deviceType",
  },
];

const measures = [
  {
    id: "totalPageViews",
    name: "Total Page Views",
    fieldName: "pageViews",
    aggregationFunction: "sum",
    formatFunction: { type: "number", parameters: { decimals: 0 } },
  },
];

const config = createSerializableCubeConfig(
  "Website Analytics",
  dataSchema,
  dimensions,
  measures,
  {
    breakdownMap: {
      "": "deviceType",
      "deviceType:*": null, // Show raw data at leaf level
    },
  },
);
```

## Format Functions

Built-in format functions for common scenarios:

```typescript
// Currency formatting
formatFunction: {
  type: "currency",
  parameters: { currency: "USD", decimals: 2 }
}

// Percentage formatting
formatFunction: {
  type: "percentage",
  parameters: { decimals: 1 }
}

// Date formatting
formatFunction: {
  type: "date",
  parameters: { format: "short" }
}

// Number formatting
formatFunction: {
  type: "number",
  parameters: { decimals: 2 }
}
```

## Aggregation Functions

Support for common aggregation operations:

- `sum` - Sum of values
- `count` - Count of items
- `average` - Average of values
- `min` - Minimum value
- `max` - Maximum value
- `first` - First value
- `last` - Last value
- `distinctCount` - Count of unique values

## Database Integration

### Storage Pattern

```typescript
// Store configuration
async function storeCubeConfiguration(
  id: string,
  config: SerializableCubeConfig,
  data?: any[],
) {
  const serialized = {
    config,
    data: data || [],
    storedAt: new Date().toISOString(),
  };

  await database.set(`cube_config_${id}`, JSON.stringify(serialized));
}

// Retrieve configuration
async function retrieveCubeConfiguration(id: string) {
  const stored = await database.get(`cube_config_${id}`);
  if (!stored) return null;

  const parsed = JSON.parse(stored);
  return {
    config: parsed.config,
    data: parsed.data,
  };
}
```

### Usage in Application

```typescript
// Save user's cube configuration (serializable config is source of truth)
const serializableConfig = getSerializableCubeConfig(data);
await storeCubeConfiguration(
  `user_${userId}_cube`,
  serializableConfig,
  rawData,
);

// Load user's cube configuration
const retrieved = await retrieveCubeConfiguration(`user_${userId}_cube`);
if (retrieved) {
  const cubeConfig = deserializeCubeConfig(retrieved.config, retrieved.data);
  // Use cubeConfig with cube service
  const cube = cubeService.calculateCube(cubeConfig);
}
```

## Validation

Comprehensive validation ensures data integrity:

```typescript
import { validateSerializableCubeConfig } from "./CubeSerialization";

const validation = validateSerializableCubeConfig(config);
if (!validation.valid) {
  console.error("Configuration errors:", validation.errors);
}
```

## Storybook Examples

See `CubeSerialization.stories.tsx` for interactive examples with Storybook Controls:

1. **Time Tracking with Simple Schema** - Daily time summaries with editable config
2. **Sales Analysis with Raw Data** - Transaction-level analysis with editable config
3. **ID-Based Dimensions** - Database scenarios with label mapping
4. **Custom Analytics Schema** - Website analytics dashboard with editable config

All stories use Storybook args to make the serialized configuration editable through the Controls panel.

## API Reference

### Core Functions

- `deserializeCubeConfig(serialized, data)` - Convert serializable config to runtime config
- `createSerializableCubeConfig(...)` - Create configuration from scratch
- `validateSerializableCubeConfig(config)` - Validate configuration

### Utility Functions

- `createDataSchema(fields)` - Create simple data schema from field definitions
- `createDimensionWithLabels(id, name, fieldName, labelMapping)` - Create dimension with ID-based label mapping
- `convertDataToSchema(data, schema)` - Convert data to match schema
- `convertToDataType(value, type)` - Convert values to specific types

### Type Definitions

- `SerializableCubeConfig` - Complete serializable configuration
- `SerializableDimension` - Serializable dimension definition
- `SerializableMeasure` - Serializable measure definition
- `SerializableDataField` - Data field schema definition
- `AggregationFunction` - Supported aggregation types
- `SerializableDataType` - Supported data types

## Best Practices

1. **Always validate** configurations before storage
2. **Use simple data schemas** - define only the fields you need
3. **Use ID-based dimensions** for database scenarios with label mapping
4. **Store schemas separately** from data for better organization
5. **Version your configurations** for backward compatibility
6. **Use strict validation** in production environments
7. **Cache deserialized configurations** to avoid repeated parsing

## Migration Guide

### From Raw Cube Configs

```typescript
// Old way - function-based
const dimensions = [
  {
    id: "region",
    name: "Region",
    getValue: (item) => item.region,
    formatValue: (value) => value.toUpperCase(),
  },
];

// New way - serializable
const dimensions = [
  {
    id: "region",
    name: "Region",
    fieldName: "region",
    formatFunction: {
      type: "uppercase",
    },
  },
];
```

### To ID-Based Dimensions

```typescript
// Convert from raw data with IDs to label-mapped dimensions
const contractorDimension = createDimensionWithLabels(
  "contractor",
  "Contractor",
  "contractorId", // Database field
  {
    "1": "Passionware Adam Borowski",
    "2": "Adam Witzberg",
    "3": "John Doe",
  },
);

// The dimension will automatically resolve IDs to labels
// contractorId: "1" → displays as "Passionware Adam Borowski"
```

### To Simple Data Schemas

```typescript
// Old way - complex metadata
const oldSchema = {
  fields: [...],
  isPreAggregated: true,
  aggregationPeriod: "day",
  metadata: { ... }
};

// New way - simple and flexible
const newSchema = createDataSchema([
  { name: "date", type: "date", description: "Work date" },
  { name: "hours", type: "number", description: "Hours worked" },
]);
```

This serialization system provides a robust foundation for persisting and sharing cube configurations while maintaining type safety and supporting flexible data structures with ID-based label mapping.
