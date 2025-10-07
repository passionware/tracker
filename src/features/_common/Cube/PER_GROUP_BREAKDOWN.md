# Per-Group Dynamic Breakdown

This feature allows users to dynamically select how to break down any group's data, not just at the root level.

## Concept

Instead of having a fixed hierarchy (e.g., Region → Category → Product), users can now choose at **each group** which dimension to use for breaking down that specific group's data.

### Example Use Case

Starting with sales data grouped by **Region**:

```
📍 North Region
  [Zoom In] [📊 Data] [📂 Groups] [📦 Category] [🏷️ Product] [👤 Salesperson]
```

Clicking **"📦 Category"** will show:

- Electronics
- Accessories
- ...

Clicking **"👤 Salesperson"** will show:

- Alice Johnson
- Bob Smith
- ...

## Implementation

### 1. Component Props

Add the `onGroupDimensionSelect` callback to `CubeView`:

```typescript
<CubeView
  cube={cube}
  enableDimensionPicker={true}
  onGroupDimensionSelect={(group, dimensionId, ancestorPath) => {
    // Handle dimension selection for this specific group
    console.log(`User wants to break down ${group.dimensionLabel} by ${dimensionId}`);
    console.log("Path:", ancestorPath.map(b => b.label).join(" > "));
  }}
/>
```

### 2. Callback Parameters

```typescript
onGroupDimensionSelect?: (
  group: CubeGroup,        // The group being broken down
  dimensionId: string,     // The dimension selected for breakdown
  ancestorPath: BreadcrumbItem[], // Full path to this group
) => void;
```

### 3. How It Works

1. **Each group shows available dimension buttons** - dimensions that haven't been used in the ancestor path
2. **User clicks a dimension button** (e.g., "Category")
3. **Callback fires** with the group, selected dimension, and full path
4. **Parent component updates** the cube configuration
5. **Cube recalculates** with the new breakdown
6. **UI updates** to show the new sub-groups

### 4. Available Dimensions Logic

For each group, the available dimensions are:

```typescript
const usedDimensions = [
  ...ancestorPath.map((b) => b.dimensionId), // Dimensions used in path
  group.dimensionId, // Current group's dimension
];

const availableDimensions = dimensions.filter(
  (d) => !usedDimensions.includes(d.id),
);
```

## Complete Example

```typescript
import { useState } from "react";
import { CubeView, cubeService } from "./Cube";

function SalesAnalysis() {
  const [groupBy, setGroupBy] = useState<string[]>(["region"]);
  const [filters, setFilters] = useState<any[]>([]);

  const config = {
    data: salesData,
    dimensions: salesDimensions,
    measures: salesMeasures,
    groupBy: groupBy,
    filters: filters,
  };

  const cube = cubeService.calculateCube(config, { includeItems: true });

  const handleGroupDimensionSelect = (
    group: CubeGroup,
    dimensionId: string,
    ancestorPath: BreadcrumbItem[],
  ) => {
    // Build filters for this specific group
    const newFilters = ancestorPath.map(b => ({
      dimensionId: b.dimensionId,
      operator: "equals" as const,
      value: b.dimensionValue,
    }));

    // Add filter for the current group
    newFilters.push({
      dimensionId: group.dimensionId,
      operator: "equals" as const,
      value: group.dimensionValue,
    });

    // Add the selected dimension to groupBy
    const newGroupBy = [
      ...ancestorPath.map(b => b.dimensionId),
      group.dimensionId,
      dimensionId, // The newly selected dimension
    ];

    setFilters(newFilters);
    setGroupBy(newGroupBy);
  };

  return (
    <CubeView
      cube={cube}
      enableDimensionPicker={true}
      enableZoomIn={true}
      enableRawDataView={true}
      onGroupDimensionSelect={handleGroupDimensionSelect}
    />
  );
}
```

## UI Appearance

Each group card will show:

```
┌─────────────────────────────────────────────────────────┐
│ 📍 North Region                            4,650 items   │
│                                                           │
│ 💰 Revenue: $12,000   📈 Profit: $4,650                 │
│                                                           │
│ [🔍 Zoom In] [📊 Data] [📂 Groups] [📦 Category] [🏷️ Product] [👤 Salesperson] │
└─────────────────────────────────────────────────────────┘
```

- **📊 Data** - View raw transactions
- **📂 Groups** - View current sub-groups (if any)
- **📦 Category** - Break down by Category dimension
- **🏷️ Product** - Break down by Product dimension
- **👤 Salesperson** - Break down by Salesperson dimension

## Benefits

1. **Flexible exploration** - Users can explore data their own way
2. **No fixed hierarchy** - Different paths for different questions
3. **Context-aware** - Only shows dimensions that make sense
4. **Visual feedback** - Clear buttons with icons and labels
5. **Works with zoom** - Combine with zoom-in for powerful navigation

## Integration with Existing Features

This feature works seamlessly with:

- ✅ **Zoom-in navigation** - Zoom into any group, then break it down further
- ✅ **Raw data viewing** - See transactions at any level
- ✅ **Global dimension picker** - Choose root-level breakdown
- ✅ **Breadcrumb navigation** - Track your exploration path
- ✅ **Summary sidebar** - See totals for current view
