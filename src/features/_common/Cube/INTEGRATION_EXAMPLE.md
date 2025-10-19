# Integrating Cube Service with GroupedViewWidget

This guide shows how to migrate your existing `GroupedViewWidget` to use the new generic `CubeService`.

## Current Architecture

Your `GroupedViewWidget` currently uses:

- Custom `GeneratedReportViewService` for grouping logic
- Report-specific data structures (`GeneratedReportSource`)
- Manual filtering and grouping implementation

## Migration to CubeService

### Step 1: Define Dimensions

Replace your existing dimension logic with `DimensionDescriptor` instances:

```typescript
import { DimensionDescriptor } from "@/services/front/CubeService";
import type { TimeEntry } from "@/api/generated-report-source/generated-report-source.api.ts";

function createDimensions(
  report: GeneratedReportSource,
  contractorNameLookup: (id: number) => string | undefined,
): DimensionDescriptor<TimeEntry>[] {
  return [
    {
      id: "contractor",
      name: "Contractor",
      icon: "👥",
      getValue: (entry) => entry.contractorId,
      formatValue: (id) =>
        contractorNameLookup(id as number) || `Contractor ${id}`,
      getKey: (id) => String(id),
    },
    {
      id: "role",
      name: "Role",
      icon: "🎭",
      getValue: (entry) => entry.roleId,
      formatValue: (id) =>
        report.data.definitions.roleTypes[id as string]?.name || id,
      getKey: (id) => String(id),
    },
    {
      id: "task",
      name: "Task",
      icon: "📋",
      getValue: (entry) => entry.taskId,
      formatValue: (id) =>
        report.data.definitions.taskTypes[id as string]?.name || id,
      getKey: (id) => String(id),
    },
    {
      id: "activity",
      name: "Activity",
      icon: "🎯",
      getValue: (entry) => entry.activityId,
      formatValue: (id) =>
        report.data.definitions.activityTypes[id as string]?.name || id,
      getKey: (id) => String(id),
    },
    {
      id: "project",
      name: "Project",
      icon: "📁",
      getValue: (entry) => entry.projectId,
      formatValue: (id) =>
        report.data.definitions.projectTypes[id as string]?.name || id,
      getKey: (id) => String(id),
    },
  ];
}
```

### Step 2: Define Measures

Replace your summary calculations with `MeasureDescriptor` instances:

```typescript
import { MeasureDescriptor } from "@/services/front/CubeService";
import { FrontServices } from "@/core/frontServices.ts";

function createMeasures(
  report: GeneratedReportSource,
  services: FrontServices,
): MeasureDescriptor<TimeEntry>[] {
  return [
    {
      id: "hours",
      name: "Total Hours",
      icon: "⏱️",
      getValue: (entry) => entry.duration / 3600, // Convert seconds to hours
      aggregate: (values) => values.reduce((sum, v) => sum + v, 0),
      formatValue: (value) => `${value.toFixed(1)}h`,
    },
    {
      id: "entries",
      name: "Entry Count",
      icon: "📊",
      getValue: () => 1,
      aggregate: (values) => values.length,
      formatValue: (value) => `${value} entries`,
    },
    {
      id: "cost",
      name: "Cost",
      icon: "💸",
      getValue: (entry) => {
        const rate = entry.costRate || 0;
        const hours = entry.duration / 3600;
        // Convert to base currency
        return services.exchangeService.convert(
          { value: rate * hours, currency: entry.costCurrency },
          services.formatService.getBaseCurrency(),
        ).value;
      },
      aggregate: (values) => values.reduce((sum, v) => sum + v, 0),
      formatValue: (value) =>
        services.formatService.formatCurrency(
          value,
          services.formatService.getBaseCurrency(),
        ),
    },
    {
      id: "billing",
      name: "Billing",
      icon: "💰",
      getValue: (entry) => {
        const rate = entry.billingRate || 0;
        const hours = entry.duration / 3600;
        return services.exchangeService.convert(
          { value: rate * hours, currency: entry.billingCurrency },
          services.formatService.getBaseCurrency(),
        ).value;
      },
      aggregate: (values) => values.reduce((sum, v) => sum + v, 0),
      formatValue: (value) =>
        services.formatService.formatCurrency(
          value,
          services.formatService.getBaseCurrency(),
        ),
    },
    {
      id: "profit",
      name: "Profit",
      icon: "📈",
      getValue: (entry) => {
        const costRate = entry.costRate || 0;
        const billingRate = entry.billingRate || 0;
        const hours = entry.duration / 3600;

        const cost = services.exchangeService.convert(
          { value: costRate * hours, currency: entry.costCurrency },
          services.formatService.getBaseCurrency(),
        ).value;

        const billing = services.exchangeService.convert(
          { value: billingRate * hours, currency: entry.billingCurrency },
          services.formatService.getBaseCurrency(),
        ).value;

        return billing - cost;
      },
      aggregate: (values) => values.reduce((sum, v) => sum + v, 0),
      formatValue: (value) =>
        services.formatService.formatCurrency(
          value,
          services.formatService.getBaseCurrency(),
        ),
    },
  ];
}
```

### Step 3: Replace GroupedViewWidget Implementation

```typescript
import { cubeService, CubeConfig, DimensionFilter } from "@/services/front/CubeService";
import { CubeView } from "@/components/ui/cube-view";

export function GroupedViewWidget(props: GroupedViewWidgetProps) {
  const [groupBy, setGroupBy] = useState<string[]>(["project"]);
  const [filters, setFilters] = useState<DimensionFilter[]>([]);
  const [activeMeasures, setActiveMeasures] = useState<string[]>([
    "hours",
    "cost",
    "billing",
    "profit",
  ]);

  // Create dimensions and measures
  const dimensions = useMemo(
    () => createDimensions(props.report, contractorNameLookup),
    [props.report, contractorNameLookup],
  );

  const measures = useMemo(
    () => createMeasures(props.report, props.services),
    [props.report, props.services],
  );

  // Build cube configuration
  const config: CubeConfig<TimeEntry> = {
    data: props.report.data.timeEntries,
    dimensions,
    measures,
    groupBy,
    filters,
    activeMeasures,
  };

  // Calculate cube
  const cube = cubeService.calculateCube(config, {
    includeItems: false,
    skipEmptyGroups: true,
  });

  return (
    <div className="space-y-6">
      {/* Configuration Panel */}
      <Card>
        <CardHeader>
          <CardTitle>Grouped View Configuration</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Group By Controls */}
          <div className="flex gap-2 mb-4">
            <span className="text-sm text-slate-600">Group by:</span>
            <Button
              variant={groupBy[0] === "contractor" ? "primary" : "secondary"}
              size="sm"
              onClick={() => setGroupBy(["contractor"])}
            >
              👥 Contractor
            </Button>
            <Button
              variant={groupBy[0] === "role" ? "primary" : "secondary"}
              size="sm"
              onClick={() => setGroupBy(["role"])}
            >
              🎭 Role
            </Button>
            <Button
              variant={groupBy[0] === "project" ? "primary" : "secondary"}
              size="sm"
              onClick={() => setGroupBy(["project"])}
            >
              📁 Project
            </Button>
            {/* Add multi-level grouping */}
            <Button
              variant={
                groupBy[0] === "project" && groupBy[1] === "contractor"
                  ? "primary"
                  : "secondary"
              }
              size="sm"
              onClick={() => setGroupBy(["project", "contractor"])}
            >
              📁 → 👥
            </Button>
          </div>

          {/* Filter Controls (using existing pickers) */}
          <div className="grid grid-cols-3 gap-4">
            <ContractorMultiPicker
              services={props.services}
              value={getFilterValue(filters, "contractor")}
              onSelect={(contractorIds) => {
                updateFilter(filters, setFilters, "contractor", "in", contractorIds);
              }}
            />
            {/* Add more filter pickers as needed */}
          </div>

          {/* Measure Selection */}
          <div className="flex gap-2 mt-4">
            <span className="text-sm text-slate-600">Show metrics:</span>
            {measures.map((measure) => (
              <Button
                key={measure.id}
                variant={activeMeasures.includes(measure.id) ? "primary" : "secondary"}
                size="sm"
                onClick={() => {
                  setActiveMeasures((prev) =>
                    prev.includes(measure.id)
                      ? prev.filter((m) => m !== measure.id)
                      : [...prev, measure.id],
                  );
                }}
              >
                {measure.icon} {measure.name}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <CubeView
        cube={cube}
        maxInitialDepth={1}
        renderCell={(cell, group) => {
          // Custom rendering for profit with color coding
          if (cell.measureId === "profit") {
            const value = cell.value as number;
            return (
              <div className={value >= 0 ? "text-green-600" : "text-red-600"}>
                {cell.formattedValue}
              </div>
            );
          }
          return <div>{cell.formattedValue}</div>;
        }}
      />
    </div>
  );
}

// Helper function to update filters
function updateFilter(
  currentFilters: DimensionFilter[],
  setFilters: (filters: DimensionFilter[]) => void,
  dimensionId: string,
  operator: FilterOperator,
  value: any,
) {
  const newFilters = currentFilters.filter((f) => f.dimensionId !== dimensionId);

  if (value && (Array.isArray(value) ? value.length > 0 : true)) {
    newFilters.push({ dimensionId, operator, value });
  }

  setFilters(newFilters);
}

function getFilterValue(filters: DimensionFilter[], dimensionId: string): any {
  const filter = filters.find((f) => f.dimensionId === dimensionId);
  return filter?.value || [];
}
```

### Step 4: Benefits

After migration, you get:

1. **Generic Reusability**: The same cube logic works for any data type
2. **Separation of Concerns**: Business logic (dimensions/measures) separate from UI
3. **Type Safety**: Full TypeScript support with proper generics
4. **Testability**: Easy to unit test cube calculations independently
5. **Flexibility**: Easy to add new dimensions, measures, or filters
6. **Performance**: Efficient filtering and grouping algorithms
7. **Extensibility**: Can add custom aggregation functions, formatters, etc.

### Step 5: Testing

You can test your cube calculations independently:

```typescript
import { describe, it, expect } from "vitest";

describe("Report Cube", () => {
  it("should calculate total hours correctly", () => {
    const dimensions = createDimensions(mockReport, () => "Test");
    const measures = createMeasures(mockReport, mockServices);

    const config: CubeConfig<TimeEntry> = {
      data: mockTimeEntries,
      dimensions,
      measures,
      groupBy: ["project"],
      activeMeasures: ["hours"],
    };

    const cube = cubeService.calculateCube(config);

    expect(cube.totalItems).toBe(mockTimeEntries.length);
    expect(cube.groups).toHaveLength(2); // 2 projects

    const hoursCell = cube.grandTotals.find((c) => c.measureId === "hours");
    expect(hoursCell?.value).toBe(40); // Total hours
  });
});
```

## Migration Checklist

- [ ] Create dimension descriptors for all grouping dimensions
- [ ] Create measure descriptors for all metrics
- [ ] Replace `GeneratedReportViewService` calls with `cubeService.calculateCube`
- [ ] Replace custom `GroupSummaryItem` with `CubeView` component
- [ ] Update filter controls to use `DimensionFilter` format
- [ ] Test all existing functionality works
- [ ] Add tests for cube calculations
- [ ] Update documentation

## Backward Compatibility

You can keep both implementations during migration:

```typescript
const USE_NEW_CUBE = true; // Feature flag

if (USE_NEW_CUBE) {
  // New cube-based implementation
  const cube = cubeService.calculateCube(config);
  return <CubeView cube={cube} />;
} else {
  // Old implementation
  const groupedView = services.generatedReportViewService.getGroupedView(...);
  return <OldGroupedView view={groupedView} />;
}
```
