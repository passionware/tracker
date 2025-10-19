# Migration Guide: CubeView API Changes

## Summary of Changes

The `CubeView` component has been refactored to use the `useCubeState` hook for all state management. This eliminates redundant state and provides a cleaner, more maintainable API.

## Breaking Changes

### Before (Old API):

```tsx
const cube = calculateCube(config);

<CubeView
  cube={cube}
  onDimensionChange={(dimensionId, level) => {
    // Handle dimension change
  }}
  onGroupDimensionSelect={(group, dimensionId, ancestorPath) => {
    // Handle group dimension selection
  }}
  onZoomIn={(group, fullPath) => {
    // Handle zoom
  }}
  enableDimensionPicker
/>;
```

### After (New API):

```tsx
const state = useCubeState({
  data,
  dimensions,
  measures,
  initialRootDimension: "region", // or use initialDefaultDimensionSequence
});

<CubeView state={state} enableDimensionPicker />;
```

## Migration Steps

### 1. Replace `calculateCube` with `useCubeState`

**Before:**

```tsx
const cube = useMemo(
  () => calculateCube(config, { includeItems: true }),
  [config],
);
```

**After:**

```tsx
const state = useCubeState({
  data,
  dimensions,
  measures,
  initialRootDimension: "dimension1",
  includeItems: true,
});
```

### 2. Replace prop passing

**Before:**

```tsx
<CubeView
  cube={cube}
  onDimensionChange={handleDimensionChange}
  onGroupDimensionSelect={handleGroupDimensionSelect}
  onZoomIn={handleZoomIn}
/>
```

**After:**

```tsx
<CubeView state={state} />
```

### 3. Remove callback handlers

All state mutations are now handled internally by `useCubeState`. You no longer need:

- `onDimensionChange`
- `onGroupDimensionSelect`
- `onZoomIn`
- `onViewRawData`
- `onDrillDown`
- `onGroupExpand`

### 4. Access state directly

If you need to read or manipulate the state:

```tsx
const state = useCubeState({...});

// Read current path
console.log(state.path);

// Read filters
console.log(state.filters);

// Manually zoom
state.zoomIn({ dimensionId: "region", dimensionValue: "North" });

// Set dimension for a node
state.setNodeChildDimension([], "category");

// Navigate breadcrumbs
state.navigateToLevel(0); // Go to level 0
state.resetZoom(); // Reset to root
```

## Props Removed from CubeView

- `cube` → Use `state` instead
- `onDimensionChange` → Handled by `state.setNodeChildDimension()`
- `onGroupDimensionSelect` → Handled by `state.setNodeChildDimension()`
- `onZoomIn` → Handled by `state.zoomIn()`
- `onViewRawData` → Handled internally
- `onDrillDown` → Removed (use `setNodeChildDimension`)
- `onGroupExpand` → Removed (managed internally)
- `availableDrillDowns` → Computed automatically

## Props Retained in CubeView

- `state` ← **NEW: Required**
- `renderGroupHeader`
- `renderCell`
- `renderRawData`
- `enableDimensionPicker`
- `maxInitialDepth`
- `enableRawDataView`
- `enableZoomIn`
- `className`

## Complete Example

```tsx
import { useCubeState, CubeView } from "@/features/_common/Cube";

function MyComponent() {
  const state = useCubeState({
    data: myData,
    dimensions: [
      {
        id: "region",
        name: "Region",
        getValue: (item) => item.region,
        icon: "🌍",
      },
      {
        id: "category",
        name: "Category",
        getValue: (item) => item.category,
        icon: "📦",
      },
    ],
    measures: [
      {
        id: "revenue",
        name: "Revenue",
        getValue: (item) => item.revenue,
        aggregate: (values) => values.reduce((sum, v) => sum + v, 0),
        formatValue: (v) => `$${v.toLocaleString()}`,
        icon: "💰",
      },
    ],
    initialRootDimension: "region",
    includeItems: true,
  });

  return (
    <CubeView
      state={state}
      enableDimensionPicker
      enableRawDataView
      enableZoomIn
      maxInitialDepth={1}
    />
  );
}
```

## Benefits

1. **Single source of truth**: All state in `useCubeState`
2. **Simpler API**: One prop instead of many callbacks
3. **Better separation**: State logic separate from UI
4. **Easier testing**: Test state logic independently
5. **No redundant state**: Eliminates sync issues
6. **Type-safe**: Better TypeScript inference
