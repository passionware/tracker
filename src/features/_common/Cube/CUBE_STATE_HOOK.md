# Cube State Hook (`useCubeState`)

The `useCubeState` hook manages all state for a multidimensional cube, following the react-stately/react-aria pattern.

## Philosophy

**Separation of Concerns:**

- `useCubeState` - Manages **data state** (breakdown map, filters, zoom path)
- `useCubeView` - Manages **view state** (display groups, UI interactions)
- `CubeView` - **Presentation only** (renders the UI)

This pattern provides:

- ✅ Reusable state logic
- ✅ Testable business logic
- ✅ Flexible UI composition
- ✅ Clear data flow

## Basic Usage

```typescript
import { useCubeState, CubeView } from "@/features/_common/Cube";

function MyCubeWidget() {
  const cubeState = useCubeState({
    data: salesData,
    dimensions: salesDimensions,
    measures: salesMeasures,
    initialRootDimension: "region",
    activeMeasures: ["revenue", "profit"],
    includeItems: true,
  });

  return (
    <CubeView
      cube={cubeState.cube}
      enableDimensionPicker={true}
      enableZoomIn={true}
      enableRawDataView={true}
      onGroupDimensionSelect={cubeState.setGroupBreakdown}
      onZoomIn={cubeState.zoomIn}
      onDimensionChange={cubeState.setRootDimension}
    />
  );
}
```

## API Reference

### Props

```typescript
interface UseCubeStateProps<TData> {
  /** Raw data to analyze */
  data: TData[];
  /** Available dimensions */
  dimensions: DimensionDescriptor<TData, unknown>[];
  /** Available measures */
  measures: MeasureDescriptor<TData, unknown>[];
  /** Initial filters */
  initialFilters?: DimensionFilter[];
  /** Initial root dimension (for per-node mode) */
  initialRootDimension?: string;
  /** Initial groupBy (for simple hierarchical mode) */
  initialGroupBy?: string[];
  /** Active measures (defaults to all) */
  activeMeasures?: string[];
  /** Include items in groups (for raw data viewing) */
  includeItems?: boolean;
  /** Maximum depth for grouping */
  maxDepth?: number;
  /** Skip empty groups */
  skipEmptyGroups?: boolean;
}
```

### Return Value

```typescript
interface CubeState {
  // ===== Computed State =====
  /** Current cube result */
  cube: CubeResult;
  /** Current breakdown map */
  breakdownMap: BreakdownMap;
  /** Current filters */
  filters: DimensionFilter[];
  /** Current zoom path */
  zoomPath: BreadcrumbItem[];

  // ===== Actions =====
  /** Set breakdown dimension for root */
  setRootDimension: (dimensionId: string) => void;

  /** Set breakdown dimension for a specific group */
  setGroupBreakdown: (
    group: CubeGroup,
    dimensionId: string,
    ancestorPath: BreadcrumbItem[],
  ) => void;

  /** Zoom into a group */
  zoomIn: (group: CubeGroup, fullPath: BreadcrumbItem[]) => void;

  /** Navigate to a specific level in zoom path */
  navigateToLevel: (index: number) => void;

  /** Reset to root */
  resetZoom: () => void;

  /** Add a filter */
  addFilter: (filter: DimensionFilter) => void;

  /** Remove a filter */
  removeFilter: (dimensionId: string) => void;

  /** Clear all filters */
  clearFilters: () => void;

  /** Update the entire breakdown map */
  setBreakdownMap: (map: BreakdownMap) => void;
}
```

## Per-Node Breakdown Mode

The hook supports **per-node breakdown** where each group can have its own breakdown dimension:

```typescript
const cubeState = useCubeState({
  data: salesData,
  dimensions: salesDimensions,
  measures: salesMeasures,
  initialRootDimension: "region", // Start with regions
  includeItems: true,
});

// Later, user clicks "Category" button on "North" group:
cubeState.setGroupBreakdown(northGroup, "category", []);
// Now "North" shows: Electronics, Accessories, ...

// User clicks "Salesperson" button on "Electronics":
cubeState.setGroupBreakdown(electronicsGroup, "salesperson", [northBreadcrumb]);
// Now "North > Electronics" shows: Alice, Bob, ...
```

### How Breakdown Map Works

The breakdown map stores which dimension to use for each node's children:

```typescript
{
  "": "region",                                    // Root level
  "region:North": "category",                      // North's children
  "region:North|category:Electronics": "salesperson", // North>Electronics' children
  "region:South": "product",                       // South's children (different!)
}
```

Path format: `dimensionId:dimensionKey|dimensionId:dimensionKey|...`

## Complete Example

```typescript
import { useCubeState, CubeView } from "@/features/_common/Cube";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

function SalesAnalysis() {
  const cubeState = useCubeState({
    data: salesData,
    dimensions: [
      { id: "region", name: "Region", icon: "🌍", getValue: (d) => d.region },
      { id: "category", name: "Category", icon: "📦", getValue: (d) => d.category },
      { id: "product", name: "Product", icon: "🏷️", getValue: (d) => d.product },
      { id: "salesperson", name: "Salesperson", icon: "👤", getValue: (d) => d.salesperson },
    ],
    measures: [
      {
        id: "revenue",
        name: "Revenue",
        icon: "💰",
        getValue: (d) => d.revenue,
        aggregate: (values) => values.reduce((sum, v) => sum + v, 0),
        formatValue: (v) => `$${v.toLocaleString()}`,
      },
      {
        id: "profit",
        name: "Profit",
        icon: "📈",
        getValue: (d) => d.revenue - d.cost,
        aggregate: (values) => values.reduce((sum, v) => sum + v, 0),
        formatValue: (v) => `$${v.toLocaleString()}`,
      },
    ],
    initialRootDimension: "region",
    activeMeasures: ["revenue", "profit"],
    includeItems: true,
  });

  return (
    <div className="space-y-4">
      {/* Filter Controls */}
      <Card className="p-4">
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => cubeState.addFilter({
              dimensionId: "region",
              operator: "equals",
              value: "North",
            })}
          >
            Filter: North Only
          </Button>
          <Button
            variant="outline"
            onClick={() => cubeState.clearFilters()}
          >
            Clear Filters
          </Button>
          <Button
            variant="outline"
            onClick={() => cubeState.resetZoom()}
          >
            Reset View
          </Button>
        </div>

        {cubeState.filters.length > 0 && (
          <div className="mt-2 text-sm">
            Active filters: {cubeState.filters.map(f => f.dimensionId).join(", ")}
          </div>
        )}
      </Card>

      {/* Cube View */}
      <CubeView
        cube={cubeState.cube}
        enableDimensionPicker={true}
        enableZoomIn={true}
        enableRawDataView={true}
        onGroupDimensionSelect={cubeState.setGroupBreakdown}
        onZoomIn={cubeState.zoomIn}
        onDimensionChange={(dimId, level) => {
          if (level === 0) {
            cubeState.setRootDimension(dimId);
          }
        }}
      />
    </div>
  );
}
```

## Advanced: Custom Breakdown Logic

You can implement custom logic for breakdown selection:

```typescript
const cubeState = useCubeState({...});

const handleSmartBreakdown = (
  group: CubeGroup,
  ancestorPath: BreadcrumbItem[],
) => {
  // Automatically choose best dimension based on context
  const usedDimensions = [
    ...ancestorPath.map(b => b.dimensionId),
    group.dimensionId,
  ];

  // Custom logic: prefer category after region, product after category
  const preferredOrder = ["region", "category", "product", "salesperson"];
  const nextDimension = preferredOrder.find(
    d => !usedDimensions.includes(d)
  );

  if (nextDimension) {
    cubeState.setGroupBreakdown(group, nextDimension, ancestorPath);
  }
};
```

## Integration with CubeView

The `CubeView` component now accepts the cube state and callbacks:

```typescript
<CubeView
  cube={cubeState.cube}

  // Breakdown controls
  enableDimensionPicker={true}
  onDimensionChange={cubeState.setRootDimension}
  onGroupDimensionSelect={cubeState.setGroupBreakdown}

  // Zoom controls
  enableZoomIn={true}
  onZoomIn={cubeState.zoomIn}

  // Other features
  enableRawDataView={true}
  showGrandTotals={true}
  maxInitialDepth={0}
/>
```

## Benefits

1. **Separation of Concerns** - State logic separate from UI
2. **Reusable** - Use the same state with different UIs
3. **Testable** - Test state logic without rendering
4. **Composable** - Combine with other hooks
5. **Performant** - Memoized cube calculation
6. **Flexible** - Support both simple and per-node modes

## Migration from Old API

**Before:**

```typescript
const [groupBy, setGroupBy] = useState(["region"]);
const cube = cubeService.calculateCube({ data, dimensions, measures, groupBy });

<CubeView
  cube={cube}
  onDimensionChange={(dimId, level) => {
    const newGroupBy = [...groupBy];
    newGroupBy[level] = dimId;
    setGroupBy(newGroupBy.slice(0, level + 1));
  }}
/>
```

**After:**

```typescript
const cubeState = useCubeState({
  data,
  dimensions,
  measures,
  initialRootDimension: "region",
});

<CubeView
  cube={cubeState.cube}
  onDimensionChange={cubeState.setRootDimension}
  onGroupDimensionSelect={cubeState.setGroupBreakdown}
  onZoomIn={cubeState.zoomIn}
/>
```

Cleaner, more powerful, and easier to understand! 🎉
