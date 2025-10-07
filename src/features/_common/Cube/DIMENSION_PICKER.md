# Dynamic Dimension Picker Feature

## Overview

The Dimension Picker allows users to dynamically choose which dimension to break down by at each level of the cube hierarchy. This gives users full control over how they want to explore their data, rather than being locked into a predefined breakdown structure.

## Features

### 1. Always-Visible Navigation Bar

- **Location**: Top of the cube view, always visible
- **Components**:
  - Breadcrumb navigation (shows current path)
  - Dimension selector dropdown (shows available dimensions)

### 2. Level-Aware Dimension Selection

- **Smart Filtering**: Only shows dimensions that haven't been used in the current path
- **Contextual**: Different available dimensions at each level based on what's already selected
- **Dynamic Updates**: Changing a dimension rebuilds the cube with the new breakdown

### 3. Combined with Zoom

- Works seamlessly with zoom-in navigation
- Breadcrumbs show where you are
- Dimension picker shows what breakdown options are available at current level

## Usage

### Basic Example

```typescript
import { CubeView, cubeService, type CubeConfig } from "@/features/_common/Cube";
import { useState } from "react";

function MyCubeComponent() {
  const [groupBy, setGroupBy] = useState<string[]>(["region"]);

  const config: CubeConfig<YourDataType> = {
    data: yourData,
    dimensions: yourDimensions,
    measures: yourMeasures,
    groupBy: groupBy,
    activeMeasures: ["revenue", "profit"],
  };

  const cube = cubeService.calculateCube(config);

  const handleDimensionChange = (dimensionId: string, level: number) => {
    const newGroupBy = [...groupBy];
    newGroupBy[level] = dimensionId;
    // Remove any dimensions after this level
    setGroupBy(newGroupBy.slice(0, level + 1));
  };

  return (
    <CubeView
      cube={cube}
      enableDimensionPicker={true}
      onDimensionChange={handleDimensionChange}
    />
  );
}
```

### With Zoom and Raw Data

```typescript
<CubeView
  cube={cube}
  enableDimensionPicker={true}
  enableZoomIn={true}
  enableRawDataView={true}
  onDimensionChange={(dimensionId, level) => {
    console.log(`Selected ${dimensionId} at level ${level}`);
    handleDimensionChange(dimensionId, level);
  }}
  onZoomIn={(group, fullPath) => {
    console.log("Zoomed into:", fullPath.map(b => b.label).join(" > "));
  }}
/>
```

## Props

### CubeView Props

| Prop                    | Type                                           | Default     | Description                                      |
| ----------------------- | ---------------------------------------------- | ----------- | ------------------------------------------------ |
| `enableDimensionPicker` | `boolean`                                      | `false`     | Enable the dimension picker dropdown             |
| `onDimensionChange`     | `(dimensionId: string, level: number) => void` | `undefined` | Callback when user selects a different dimension |

## User Experience

### Flow at Root Level

1. **Initial State**: User sees navigation bar with "Root" breadcrumb
2. **Dimension Picker**: Dropdown shows "Break down by:" with all available dimensions
3. **Selection**: User selects a dimension (e.g., "Region")
4. **Result**: Cube recalculates and shows groups broken down by selected dimension

### Flow After Zooming In

1. **Zoom Action**: User clicks "Zoom In" on "North" region
2. **Breadcrumb**: Shows "Root > North"
3. **Dimension Picker**: Shows remaining dimensions (excluding "Region" which is already used)
4. **Selection**: User can choose next level breakdown (e.g., "Category")
5. **Result**: Shows categories within the North region

### Flow When Changing Dimension

1. **Current State**: Breakdown is Region > Category > Product
2. **User Action**: At Category level, changes to "Salesperson"
3. **Result**:
   - Breakdown becomes Region > Salesperson
   - Product level is removed (since it was after the changed level)
   - Cube recalculates with new hierarchy

## Implementation Details

### Available Dimensions Logic

```typescript
// Get dimensions already used in the current path
const usedDimensionIds = zoomPath.map((b) => b.dimensionId);

// Get the current dimension at this level
const currentDimensionId = config.groupBy?.[zoomPath.length];

// Filter out already-used dimensions
const availableDimensions = config.dimensions.filter(
  (d) => !usedDimensionIds.includes(d.id),
);
```

### Dimension Change Handler

```typescript
const handleDimensionChange = (dimensionId: string, level: number) => {
  const newGroupBy = [...groupBy];

  // Set the dimension at the specified level
  newGroupBy[level] = dimensionId;

  // Remove any dimensions after this level (they become invalid)
  setGroupBy(newGroupBy.slice(0, level + 1));

  // Trigger cube recalculation
  // (happens automatically when groupBy state changes)
};
```

## Visual Design

### Navigation Bar Layout

```
┌──────────────────────────────────────────────────────────────┐
│  [🏠 Root] > [North] > [Electronics]    Break down by: [▼]   │
│   Breadcrumbs                            Dimension Picker     │
└──────────────────────────────────────────────────────────────┘
```

### States

- **Root Level**: Shows "Break down by:" with all dimensions
- **After Selection**: Dimension picker shows remaining options
- **All Dimensions Used**: Dimension picker hidden
- **Zoomed In**: Breadcrumbs show path, picker shows available dimensions

## Examples

### Sales Analysis Flow

```typescript
// Available dimensions: Region, Category, Product, Salesperson

// Level 0 (Root)
// User selects: "Region"
groupBy = ["region"];

// Level 1 (zoomed into "North")
// Available: Category, Product, Salesperson
// User selects: "Category"
groupBy = ["region", "category"];

// Level 2 (zoomed into "North > Electronics")
// Available: Product, Salesperson
// User selects: "Product"
groupBy = ["region", "category", "product"];

// Level 3 (zoomed into "North > Electronics > Laptop")
// Available: Salesperson
// User selects: "Salesperson"
groupBy = ["region", "category", "product", "salesperson"];
```

### Changing Mid-Hierarchy

```typescript
// Current state
groupBy = ["region", "category", "product"];
// Path: North > Electronics > Laptop Pro

// User at level 1 (category) changes to "Salesperson"
handleDimensionChange("salesperson", 1);

// New state
groupBy = ["region", "salesperson"];
// Path: North > (salesperson options)
// Product level is removed
```

## Benefits

1. **Flexibility**: Users can explore data in any order that makes sense to them
2. **Discovery**: Easy to try different breakdowns to find insights
3. **Contextual**: Only relevant dimensions shown at each level
4. **Intuitive**: Combined with breadcrumbs for clear navigation
5. **Powerful**: Unlimited combinations of dimension hierarchies

## Best Practices

1. **Provide Icons**: Add icons to dimensions for better visual recognition
2. **Clear Labels**: Use descriptive dimension names
3. **Logical Order**: Order dimensions in the array by most common to least common usage
4. **Handle State**: Store `groupBy` in component state for reactivity
5. **Persist Selection**: Consider saving user's preferred breakdown in localStorage

## Compatibility

- ✅ Works with zoom-in navigation
- ✅ Works with raw data viewing
- ✅ Works with all cube features
- ✅ Responsive design
- ✅ Keyboard accessible (Select component)

## Storybook

See **Story 16: DynamicDimensionPicker** in `CubeView.stories.tsx` for a live interactive example.
