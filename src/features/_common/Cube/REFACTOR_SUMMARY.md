# Refactor Summary: Removed Global `groupBy`, Unified Breakdown System

## What Changed

### Before

The Cube system had **two separate mechanisms** for defining hierarchies:

1. **`groupBy: string[]`** - A global array that applied the same hierarchy to all branches
2. **`breakdownMap: BreakdownMap`** - Per-node breakdown configuration

This was confusing because:

- Users wondered which one takes precedence
- The `groupBy` name didn't align with the per-node breakdown mental model
- It created two paths to accomplish the same thing

### After

The Cube system now has **one unified mechanism**:

1. **`breakdownMap: BreakdownMap`** - The **primary way** to define hierarchies (supports wildcards)
2. **`defaultDimensionSequence: string[]`** - A **convenience shorthand** that gets converted to wildcard `breakdownMap`

This is clearer because:

- Everything uses `breakdownMap` internally
- `defaultDimensionSequence` is clearly a convenience option
- The system is conceptually simpler

---

## Files Changed

### 1. **Type Definitions** (`CubeService.types.ts`)

- ❌ Removed: `CubeConfig.groupBy`
- ✅ Added: `CubeConfig.defaultDimensionSequence` (marked as `@deprecated` to encourage using `breakdownMap`)

### 2. **Core Service** (`CubeService.ts`)

- ❌ Removed: `buildGroups()` function (old legacy mode)
- ✅ Added: `dimensionSequenceToBreakdownMap()` - Converts simple sequence to wildcards
- ✅ Enhanced: `buildGroupsWithBreakdownMap()` - Now supports wildcard matching
- ✅ Updated: `calculateCube()` - Converts `defaultDimensionSequence` to `breakdownMap` if needed

### 3. **React Hook** (`useCubeState.ts`)

- ❌ Removed: `UseCubeStateProps.initialGroupBy`
- ✅ Added: `UseCubeStateProps.initialDefaultDimensionSequence` (marked as `@deprecated`)
- ✅ Updated: Initial state calculation converts sequence to wildcards

### 4. **View Component** (`CubeView.tsx`)

- ✅ Updated: `appliedDimensions` now extracts from `breakdownMap` instead of `groupBy`
- ✅ Updated: `currentDimensionId` now uses `displayGroups[0]?.dimensionId`

### 5. **Stories** (`CubeView.stories.tsx`)

- ✅ Updated: All 14 stories now use `defaultDimensionSequence` instead of `groupBy`

### 6. **Quick Start** (`QUICK_START.tsx`)

- ✅ Updated: Example uses `defaultDimensionSequence`
- ✅ Updated: Documentation references updated

### 7. **Documentation**

- ✅ Created: `BREAKING_CHANGE_NO_GROUPBY.md` - Migration guide
- ✅ Updated: `HOW_BREAKDOWN_WORKS.md` - Explains new system with wildcards
- ✅ Created: `REFACTOR_SUMMARY.md` - This file

---

## Key Technical Changes

### Wildcard Support

The `buildGroupsWithBreakdownMap()` function now supports wildcard matching:

```typescript
// Before: Only exact path lookup
const childDimensionId = breakdownMap[nodePath];

// After: Exact path with wildcard fallback
let childDimensionId = breakdownMap[nodePath];

if (!childDimensionId) {
  // Try wildcard match
  const wildcardPath = parentPath
    ? `${parentPath}|${dimensionId}:*`
    : `${dimensionId}:*`;
  childDimensionId = breakdownMap[wildcardPath];
}
```

This allows `defaultDimensionSequence` to create a fixed hierarchy via wildcards:

```typescript
defaultDimensionSequence: ["region", "category", "product"]

// Internally becomes:
breakdownMap: {
  "": "region",
  "region:*": "category",           // Matches ALL regions
  "region:*|category:*": "product", // Matches ALL region+category combos
}
```

### Priority System

The lookup priority is:

1. **Exact path** (e.g., `"region:North"`)
2. **Wildcard pattern** (e.g., `"region:*"`)
3. **No breakdown** (leaf node)

This means you can override specific nodes while keeping a default for others:

```typescript
breakdownMap: {
  "": "region",
  "region:*": "category",        // Default: All regions → category
  "region:North": "product",     // Override: North → product (skip category)
}
```

---

## Migration Examples

### Example 1: Simple Story

**Before:**

```typescript
const config: CubeConfig<SalesTransaction> = {
  data: salesData,
  dimensions: salesDimensions,
  measures: salesMeasures,
  groupBy: ["region", "category"], // ❌
};
```

**After:**

```typescript
const config: CubeConfig<SalesTransaction> = {
  data: salesData,
  dimensions: salesDimensions,
  measures: salesMeasures,
  defaultDimensionSequence: ["region", "category"], // ✅
};
```

### Example 2: With State

**Before:**

```typescript
const [groupBy, setGroupBy] = useState<string[]>(["region"]);

const config: CubeConfig<SalesTransaction> = {
  data: salesData,
  dimensions: salesDimensions,
  measures: salesMeasures,
  groupBy: groupBy, // ❌
};
```

**After:**

```typescript
const [groupBy, setGroupBy] = useState<string[]>(["region"]);

const config: CubeConfig<SalesTransaction> = {
  data: salesData,
  dimensions: salesDimensions,
  measures: salesMeasures,
  defaultDimensionSequence: groupBy, // ✅
};
```

### Example 3: Using `useCubeState`

**Before:**

```typescript
const cubeState = useCubeState({
  data: salesData,
  dimensions,
  measures,
  initialGroupBy: ["region", "category"], // ❌
});
```

**After:**

```typescript
const cubeState = useCubeState({
  data: salesData,
  dimensions,
  measures,
  initialDefaultDimensionSequence: ["region", "category"], // ✅
});
```

---

## Benefits of This Refactor

### 1. **Conceptual Simplicity**

- One underlying system (`breakdownMap`)
- `defaultDimensionSequence` is clearly a convenience wrapper

### 2. **No Ambiguity**

- No more wondering: "If I set both `groupBy` and `breakdownMap`, which wins?"
- Clear precedence: `breakdownMap` (if provided) > `defaultDimensionSequence` (if provided) > empty

### 3. **Flexibility**

- Wildcards allow simple hierarchies
- Exact paths allow per-node customization
- Mix both in the same `breakdownMap`

### 4. **Better Alignment**

- The name `defaultDimensionSequence` makes it clear this is a **default**
- Aligns with the per-node breakdown feature
- Users understand they can override defaults with `setGroupBreakdown()`

### 5. **Future-Proof**

- All future enhancements only need to touch `breakdownMap`
- No need to maintain two separate code paths

---

## Testing

All Storybook stories have been updated and verified:

- ✅ `SalesByRegion`
- ✅ `SalesByRegionAndCategory`
- ✅ `InteractiveSalesCube`
- ✅ `TimeTrackingCube`
- ✅ `CustomRendering`
- ✅ `AllMeasures`
- ✅ `GrandTotalsOnly`
- ✅ `WithRawDataView`
- ✅ `CustomRawDataRendering`
- ✅ `ProjectTrackingByUser`
- ✅ `ProjectTrackingHierarchy`
- ✅ `ProjectTrackingWithRawData`
- ✅ `BillableAnalysis`
- ✅ `InteractiveProjectDashboard`
- ✅ `ZoomInNavigation`

All linter errors resolved: ✅

---

## Next Steps

### For New Code

- Use `breakdownMap` directly for maximum flexibility
- Use `defaultDimensionSequence` for simple, fixed hierarchies
- Use `useCubeState.setGroupBreakdown()` for dynamic, user-driven breakdowns

### For Existing Code

- No immediate action required if you're using `useCubeState` with the interactive stories
- If you have any direct `CubeConfig` creation, replace `groupBy` with `defaultDimensionSequence`

---

## Summary

This refactor removes the conceptual overhead of having two separate hierarchy mechanisms and unifies everything under a single, flexible `breakdownMap` system with wildcard support. The `defaultDimensionSequence` option provides backward compatibility and convenience while making it clear that `breakdownMap` is the primary, more flexible option.

**Result:** A clearer, more consistent API that's easier to understand and use.
