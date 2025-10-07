# Cube Widget - Multidimensional Analytics Engine

A generic, type-safe widget for creating OLAP-style multidimensional cubes in React applications.

## Quick Start

```typescript
import { cubeService, CubeView, type CubeConfig } from "@/widgets/_common/Cube";

// 1. Define your data type
interface SalesData {
  region: string;
  product: string;
  revenue: number;
}

// 2. Create dimensions (what to group by)
const dimensions = [
  {
    id: "region",
    name: "Region",
    icon: "🌍",
    getValue: (item: SalesData) => item.region,
  },
  {
    id: "product",
    name: "Product",
    icon: "📦",
    getValue: (item: SalesData) => item.product,
  },
];

// 3. Create measures (what to calculate)
const measures = [
  {
    id: "totalRevenue",
    name: "Total Revenue",
    icon: "💰",
    getValue: (item: SalesData) => item.revenue,
    aggregate: (values: number[]) => values.reduce((sum, v) => sum + v, 0),
    formatValue: (value: number) => `$${value.toLocaleString()}`,
  },
];

// 4. Calculate the cube
const config: CubeConfig<SalesData> = {
  data: salesData,
  dimensions,
  measures,
  groupBy: ["region", "product"], // Create hierarchy
};

const cube = cubeService.calculateCube(config);

// 5. Render the results
<CubeView cube={cube} showGrandTotals={true} />
```

## Features

- ✅ **Generic & Type-Safe**: Works with any data structure
- ✅ **Multi-dimensional Grouping**: Create hierarchical views
- ✅ **Flexible Filtering**: 11 different filter operators
- ✅ **Custom Aggregations**: Sum, average, count, or custom logic
- ✅ **Format Control**: Custom formatters for display values
- ✅ **React Integration**: Pre-built UI components
- ✅ **Drill-down Support**: Interactive data exploration
- ✅ **Raw Data Viewing**: View underlying data items for any group
- ✅ **Zoom-In Navigation**: Focus on specific groups with breadcrumb navigation
- ✅ **Dynamic Dimension Picker**: Let users choose breakdown dimensions on the fly
- ✅ **Performance Optimized**: Efficient in-memory processing
- ✅ **Smooth Animations**: Framer Motion for polished UX

## Files

- **CubeService.types.ts** - TypeScript type definitions
- **CubeService.ts** - Core calculation functions (functional approach)
- **CubeView.tsx** - React visualization component
- **index.ts** - Public API exports
- **CUBE_SERVICE.md** - Complete documentation
- **INTEGRATION_EXAMPLE.md** - GroupedViewWidget migration guide
- **QUICK_START.tsx** - Quick start example
- **ZOOM_FEATURE.md** - Zoom-in navigation guide
- **DIMENSION_PICKER.md** - Dynamic dimension selection guide
- **README.md** - This file

## Documentation

- 📘 [Complete Documentation](CUBE_SERVICE.md) - Full API reference and examples
- 🔗 [Integration Guide](INTEGRATION_EXAMPLE.md) - Migrate GroupedViewWidget to Cube Widget
- 🔍 [Zoom Feature Guide](ZOOM_FEATURE.md) - Zoom-in navigation with breadcrumbs
- 🎛️ [Dimension Picker Guide](DIMENSION_PICKER.md) - Dynamic dimension selection
- 📚 [Storybook](CubeView.stories.tsx) - Live interactive examples
- ⚡ [Quick Start](QUICK_START.tsx) - Copy-paste example to get started

## Examples

### Basic Grouping

```typescript
const cube = cubeService.calculateCube({
  data: salesData,
  dimensions: [regionDimension, productDimension],
  measures: [revenueMeasure],
  groupBy: ["region"],
});
```

### Multi-level Grouping

```typescript
const cube = cubeService.calculateCube({
  data: salesData,
  dimensions: [regionDimension, productDimension, salespersonDimension],
  measures: [revenueMeasure, profitMeasure],
  groupBy: ["region", "product"], // Region → Product hierarchy
});
```

### With Filters

```typescript
const cube = cubeService.calculateCube({
  data: salesData,
  dimensions,
  measures,
  groupBy: ["region"],
  filters: [
    { dimensionId: "region", operator: "in", value: ["North", "South"] },
    { dimensionId: "revenue", operator: "greaterThan", value: 1000 },
  ],
});
```

### Custom Aggregation

```typescript
const avgRevenueMeasure = {
  id: "avgRevenue",
  name: "Average Revenue",
  getValue: (item) => item.revenue,
  aggregate: (values) =>
    values.length > 0
      ? values.reduce((sum, v) => sum + v, 0) / values.length
      : 0,
  formatValue: (value) => `$${value.toFixed(2)}`,
};
```

### View Raw Data

```typescript
// Enable raw data viewing
const cube = cubeService.calculateCube(config, {
  includeItems: true, // IMPORTANT: Include items in groups
});

// Render with raw data enabled
<CubeView
  cube={cube}
  enableRawDataView={true}
  renderRawData={(items, group) => (
    <table>
      {items.map(item => (
        <tr><td>{JSON.stringify(item)}</td></tr>
      ))}
    </table>
  )}
/>
```

### Zoom-In Navigation

```typescript
<CubeView
  cube={cube}
  enableZoomIn={true}
  onZoomIn={(group, fullPath) => {
    // fullPath is an array of dimension filters: [dimensionId -> value]
    console.log("Zoomed into:", group.dimensionLabel);
    console.log("Path:", fullPath.map(b => `${b.dimensionId}=${b.label}`).join(" > "));
    // Example: "region=North > category=Electronics > product=Laptop Pro"
  }}
/>
```

**Features:**

- 🔍 Click "Zoom In" to focus on a group's sub-groups only
- 🏠 Breadcrumb navigation shows your current dimension path
- ↩️ Click any breadcrumb to navigate back to that level
- 📊 Grand totals hidden when zoomed in
- 🗺️ Full path tracking: `[dimensionId → value, dimensionId2 → value2, ...]`
- ✨ Smooth Framer Motion animations

See [ZOOM_FEATURE.md](ZOOM_FEATURE.md) for detailed documentation.

### Dynamic Dimension Selection

```typescript
const [groupBy, setGroupBy] = useState<string[]>(["region"]);

<CubeView
  cube={cube}
  enableDimensionPicker={true}
  onDimensionChange={(dimensionId, level) => {
    const newGroupBy = [...groupBy];
    newGroupBy[level] = dimensionId;
    setGroupBy(newGroupBy.slice(0, level + 1));
  }}
/>
```

**Features:**

- 🎛️ Navigation bar with dimension selector dropdown
- 📋 "Break down by:" label with available dimensions
- 🔄 Only shows dimensions not already used in the path
- 🏠 Always visible breadcrumb navigation
- ⚡ Real-time cube recalculation on selection change

See [DIMENSION_PICKER.md](DIMENSION_PICKER.md) for detailed documentation.

## Common Use Cases

### 1. Sales Analytics

Group sales by region, product, salesperson. Calculate revenue, profit, margins.

### 2. Time Tracking

Group time entries by project, contractor, role. Calculate hours, cost, billing.

### 3. Financial Reporting

Group transactions by account, category, period. Calculate totals, averages, variances.

### 4. Inventory Analysis

Group inventory by location, category, supplier. Calculate quantities, values, turnovers.

### 5. Customer Analytics

Group customers by segment, region, status. Calculate counts, lifetime value, churn rates.

## API Overview

### Cube Functions

- `calculateCube(config, options?)` - Calculate a cube from data
- `getCellValue(group, measureId)` - Get a specific cell value
- `getFormattedCellValue(group, measureId)` - Get formatted cell value
- `findGroups(groups, predicate, recursive?)` - Find matching groups
- `flattenGroups(groups)` - Flatten hierarchy to array
- `createCubeService()` - Factory function to create a service instance
- `cubeService` - Default service instance

### Filter Operators

`equals`, `notEquals`, `in`, `notIn`, `greaterThan`, `lessThan`, `greaterThanOrEqual`, `lessThanOrEqual`, `contains`, `startsWith`, `endsWith`

## Performance

- Handles 10,000+ items efficiently in-memory
- O(n) filtering and O(n log n) grouping complexity
- Configurable max depth to prevent excessive nesting
- Optional item inclusion for drill-through

## Testing

Run Storybook to see live examples:

```bash
npm run storybook
```

## TypeScript Support

Full type inference for data types, dimensions, and measures:

```typescript
import type {
  CubeConfig,
  DimensionDescriptor,
  MeasureDescriptor,
  CubeResult,
} from "@/widgets/_common/Cube";
```

## Contributing

When adding features:

1. Update types in `CubeService.types.ts`
2. Implement logic in `CubeService.ts`
3. Add Storybook example in `CubeView.stories.tsx`
4. Update documentation in `CUBE_SERVICE.md`

## License

Part of the Passionware Tracker project.
