# Cube Service - Multidimensional Analytics

A generic, type-safe service for creating OLAP-style multidimensional cubes in React applications.

## Overview

The Cube Service provides:

- **Generic data handling**: Works with any array of objects
- **Flexible dimensions**: Define custom dimensions with getters and formatters
- **Custom measures**: Calculate any metric with custom aggregation logic
- **Filtering**: Support for multiple filter operators
- **Multi-level grouping**: Create hierarchical group-by views
- **Type safety**: Full TypeScript support

## Core Concepts

### 1. Dimensions

Dimensions are attributes you can group or filter by (e.g., Region, Product, Date).

```typescript
const dimension: DimensionDescriptor<MyData> = {
  id: "region",
  name: "Region",
  icon: "🌍",
  getValue: (item) => item.region,
  formatValue: (value) => value.toUpperCase(),
  getKey: (value) => String(value), // Optional: custom key for grouping
};
```

### 2. Measures

Measures are numeric values you calculate and aggregate (e.g., Revenue, Count, Average).

```typescript
const measure: MeasureDescriptor<MyData> = {
  id: "revenue",
  name: "Total Revenue",
  icon: "💰",
  getValue: (item) => item.amount,
  aggregate: (values) => values.reduce((sum, v) => sum + v, 0),
  formatValue: (value) => `$${value.toLocaleString()}`,
};
```

### 3. Filters

Apply conditions to filter data before grouping.

```typescript
const filters: DimensionFilter[] = [
  {
    dimensionId: "region",
    operator: "in",
    value: ["North", "South"],
  },
  {
    dimensionId: "revenue",
    operator: "greaterThan",
    value: 1000,
  },
];
```

### 4. Grouping

Create hierarchical groupings by specifying dimension IDs in order.

```typescript
const config: CubeConfig<MyData> = {
  data: myDataArray,
  dimensions: [regionDimension, productDimension],
  measures: [revenueMeasure, profitMeasure],
  groupBy: ["region", "product"], // Region → Product hierarchy
  filters: [],
};
```

## Basic Usage

### Step 1: Define Your Data Type

```typescript
interface SalesRecord {
  id: string;
  date: string;
  product: string;
  region: string;
  amount: number;
  cost: number;
}
```

### Step 2: Define Dimensions

```typescript
import { DimensionDescriptor } from "@/services/front/CubeService";

const dimensions: DimensionDescriptor<SalesRecord>[] = [
  {
    id: "region",
    name: "Sales Region",
    icon: "🌍",
    getValue: (item) => item.region,
  },
  {
    id: "product",
    name: "Product",
    icon: "📦",
    getValue: (item) => item.product,
  },
];
```

### Step 3: Define Measures

```typescript
import { MeasureDescriptor } from "@/services/front/CubeService";

const measures: MeasureDescriptor<SalesRecord>[] = [
  {
    id: "totalRevenue",
    name: "Total Revenue",
    icon: "💰",
    getValue: (item) => item.amount,
    aggregate: (values) => values.reduce((sum, v) => sum + v, 0),
    formatValue: (value) => `$${value.toLocaleString()}`,
  },
  {
    id: "totalProfit",
    name: "Total Profit",
    icon: "📈",
    getValue: (item) => item.amount - item.cost,
    aggregate: (values) => values.reduce((sum, v) => sum + v, 0),
    formatValue: (value) => `$${value.toLocaleString()}`,
  },
  {
    id: "avgRevenue",
    name: "Average Revenue",
    icon: "📊",
    getValue: (item) => item.amount,
    aggregate: (values) =>
      values.length > 0
        ? values.reduce((sum, v) => sum + v, 0) / values.length
        : 0,
    formatValue: (value) => `$${value.toFixed(2)}`,
  },
];
```

### Step 4: Calculate the Cube

```typescript
import { cubeService, CubeConfig } from "@/services/front/CubeService";

const config: CubeConfig<SalesRecord> = {
  data: salesData,
  dimensions,
  measures,
  groupBy: ["region", "product"],
  activeMeasures: ["totalRevenue", "totalProfit"], // Optional: select specific measures
  filters: [
    {
      dimensionId: "region",
      operator: "in",
      value: ["North", "South"],
    },
  ],
};

const cube = cubeService.calculateCube(config, {
  includeItems: false, // Set true for drill-through capability
  maxDepth: 10,
  skipEmptyGroups: true,
});
```

### Step 5: Render the Cube

```typescript
import { CubeView } from "@/components/ui/cube-view";

function MyCubeReport() {
  return <CubeView cube={cube} maxInitialDepth={1} />;
}
```

## Advanced Usage

### Custom Cell Rendering

```typescript
<CubeView
  cube={cube}
  renderCell={(cell, group) => {
    const value = cell.value as number;
    const isNegative = value < 0;

    return (
      <div className={isNegative ? "text-red-600" : "text-green-600"}>
        {cell.formattedValue}
      </div>
    );
  }}
/>
```

### Custom Group Header

```typescript
<CubeView
  cube={cube}
  renderGroupHeader={(group, level) => (
    <div>
      <h4>{group.dimensionLabel}</h4>
      <span>Level {level} - {group.itemCount} items</span>
    </div>
  )}
/>
```

### Dynamic Filtering and Grouping

```typescript
function InteractiveCube() {
  const [groupBy, setGroupBy] = useState<string[]>(["region"]);
  const [filters, setFilters] = useState<DimensionFilter[]>([]);

  const config: CubeConfig<SalesRecord> = {
    data: salesData,
    dimensions,
    measures,
    groupBy,
    filters,
  };

  const cube = cubeService.calculateCube(config);

  return (
    <div>
      <div>
        <button onClick={() => setGroupBy(["region"])}>By Region</button>
        <button onClick={() => setGroupBy(["product"])}>By Product</button>
        <button onClick={() => setGroupBy(["region", "product"])}>
          Region → Product
        </button>
      </div>

      <CubeView cube={cube} />
    </div>
  );
}
```

### Accessing Cube Results Programmatically

```typescript
// Get grand totals
cube.grandTotals.forEach((cell) => {
  console.log(`${cell.measureId}: ${cell.formattedValue}`);
});

// Find specific groups
const northGroups = cubeService.findGroups(
  cube.groups,
  (group) => group.dimensionLabel === "North",
);

// Flatten all groups
const allGroups = cubeService.flattenGroups(cube.groups);

// Get specific cell value
const revenue = cubeService.getCellValue(cube.groups[0], "totalRevenue");
```

## Filter Operators

Available operators:

- `equals` - Exact match
- `notEquals` - Not equal to
- `in` - Value in array
- `notIn` - Value not in array
- `greaterThan` - Numeric comparison
- `lessThan` - Numeric comparison
- `greaterThanOrEqual` - Numeric comparison
- `lessThanOrEqual` - Numeric comparison
- `contains` - String contains
- `startsWith` - String starts with
- `endsWith` - String ends with

## Integration with GroupedViewWidget

To integrate with your existing `GroupedViewWidget`:

```typescript
import { cubeService, CubeConfig } from "@/services/front/CubeService";
import { CubeView } from "@/components/ui/cube-view";

// Define dimensions based on your report data
const dimensions: DimensionDescriptor<TimeEntry>[] = [
  {
    id: "contractor",
    name: "Contractor",
    icon: "👥",
    getValue: (entry) => entry.contractorId,
    formatValue: (id) => contractorNameLookup(id) || `Contractor ${id}`,
    getKey: (id) => String(id),
  },
  {
    id: "role",
    name: "Role",
    icon: "🎭",
    getValue: (entry) => entry.roleId,
    formatValue: (id) => report.data.definitions.roleTypes[id]?.name || id,
  },
  // ... more dimensions
];

// Define measures
const measures: MeasureDescriptor<TimeEntry>[] = [
  {
    id: "hours",
    name: "Total Hours",
    icon: "⏱️",
    getValue: (entry) => entry.duration / 3600, // Convert to hours
    aggregate: (values) => values.reduce((sum, v) => sum + v, 0),
    formatValue: (value) => `${value.toFixed(1)}h`,
  },
  // ... more measures
];

// Use in your widget
const config: CubeConfig<TimeEntry> = {
  data: report.data.timeEntries,
  dimensions,
  measures,
  groupBy: ["project", "contractor"],
  filters: entryFilters,
};

const cube = cubeService.calculateCube(config);

return <CubeView cube={cube} />;
```

## Performance Considerations

- **Large datasets**: The service handles filtering and grouping in-memory. For datasets > 10,000 items, consider server-side processing.
- **Deep nesting**: Set `maxDepth` option to prevent excessive nesting levels.
- **Include items**: Setting `includeItems: true` stores all original items in each group, which increases memory usage.

## Examples

See `src/stories/CubeView.stories.tsx` for complete working examples including:

- Basic grouping
- Multi-level hierarchies
- Interactive filtering
- Custom rendering
- Time tracking analytics
- Sales analytics

## API Reference

### CubeService

#### `calculateCube<TData>(config, options?): CubeResult`

Main method to calculate a cube.

#### `getCellValue(group, measureId): unknown`

Get a cell value from a group.

#### `getFormattedCellValue(group, measureId): string`

Get formatted cell value from a group.

#### `findGroups(groups, predicate, recursive?): CubeGroup[]`

Find groups matching a condition.

#### `flattenGroups(groups): CubeGroup[]`

Flatten nested groups into a flat array.

## TypeScript Support

All types are fully typed. Import types as needed:

```typescript
import type {
  CubeConfig,
  CubeResult,
  CubeGroup,
  CubeCell,
  DimensionDescriptor,
  MeasureDescriptor,
  DimensionFilter,
} from "@/services/front/CubeService";
```
