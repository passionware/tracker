# Breaking Change: Removed Global `groupBy` Array

## Summary

We've removed the global `groupBy` array from the Cube system and replaced it with:

1. **`breakdownMap`** (primary, flexible mode)
2. **`defaultDimensionSequence`** (convenience option for simple cases)

## Why This Change?

The old `groupBy` array was confusing because:

- It implied a **global, fixed hierarchy** for all branches
- It conflicted conceptually with the **per-node breakdown** feature
- Users would wonder: "Can I set a breakdown for a specific node when there's already a global groupBy?"

The new system is clearer:

- **`breakdownMap`** is the **primary way** to define hierarchies
- **`defaultDimensionSequence`** is a **convenience shorthand** that gets converted to `breakdownMap` with wildcards
- Everything uses the same underlying mechanism

---

## Migration Guide

### Before (Old API):

```typescript
const config: CubeConfig = {
  data: salesData,
  dimensions: [region, category, product],
  measures: [revenue],
  groupBy: ["region", "category", "product"], // ❌ Removed
};
```

### After (Option 1 - Simple Mode):

```typescript
const config: CubeConfig = {
  data: salesData,
  dimensions: [region, category, product],
  measures: [revenue],
  defaultDimensionSequence: ["region", "category", "product"], // ✅ New convenience option
};
```

**What happens internally:**

```typescript
// Automatically converted to:
breakdownMap: {
  "": "region",
  "region:*": "category",           // Wildcard: matches ANY region
  "region:*|category:*": "product", // Wildcard: matches ANY region+category
}
```

### After (Option 2 - Flexible Mode):

```typescript
const config: CubeConfig = {
  data: salesData,
  dimensions: [region, category, product],
  measures: [revenue],
  breakdownMap: {
    "": "region", // Root uses region
    "region:North": "category", // North uses category
    "region:South": "salesperson", // South uses salesperson (different!)
    // Add more as needed
  },
};
```

---

## For `useCubeState` Hook

### Before:

```typescript
const cubeState = useCubeState({
  data: salesData,
  dimensions,
  measures,
  initialGroupBy: ["region", "category"], // ❌ Removed
});
```

### After (Simple Mode):

```typescript
const cubeState = useCubeState({
  data: salesData,
  dimensions,
  measures,
  initialDefaultDimensionSequence: ["region", "category"], // ✅ New
});
```

### After (Flexible Mode):

```typescript
const cubeState = useCubeState({
  data: salesData,
  dimensions,
  measures,
  initialRootDimension: "region", // Just set the root
  // Users can then dynamically set breakdowns via:
  // cubeState.setGroupBreakdown(northGroup, "category", [])
});
```

---

## Key Benefits

### 1. **Consistency**

Everything uses `breakdownMap` internally. No dual system.

### 2. **Clarity**

- Want a simple, fixed hierarchy? → Use `defaultDimensionSequence`
- Want per-node flexibility? → Use `breakdownMap` or `setGroupBreakdown()`

### 3. **Flexibility**

You can **mix** both approaches:

```typescript
breakdownMap: {
  "": "region",
  "region:*": "category",           // Default for all regions
  "region:North": "product",        // Override for North specifically
  "region:South|salesperson:*": "product", // Default for all salespeople in South
}
```

### 4. **Discoverability**

- `defaultDimensionSequence` is clearly marked as a convenience option
- `breakdownMap` is documented as the primary way
- No confusion about which one takes precedence

---

## Technical Details

### Wildcard Matching

When looking up the breakdown dimension for a node:

1. **First**, try exact match:

   ```typescript
   childDimensionId = breakdownMap["region:North"];
   ```

2. **Then**, try wildcard match:
   ```typescript
   childDimensionId = breakdownMap["region:*"];
   ```

This allows `defaultDimensionSequence` to work (it creates wildcard patterns) while still supporting specific overrides.

### Code Location

- **`CubeService.types.ts`**: Type definitions
  - `CubeConfig.defaultDimensionSequence` (deprecated, but supported)
  - `CubeConfig.breakdownMap` (primary)

- **`CubeService.ts`**: Core logic
  - `dimensionSequenceToBreakdownMap()` (line 204-243): Converts sequence to wildcards
  - `buildGroupsWithBreakdownMap()` (line 116-202): Supports wildcard matching
  - `calculateCube()` (line 255-331): Converts `defaultDimensionSequence` if needed

- **`useCubeState.ts`**: React hook
  - `UseCubeStateProps.initialDefaultDimensionSequence` (convenience)
  - `UseCubeStateProps.initialRootDimension` (flexible)
  - Converts sequence to wildcards in `useState` initializer (line 102-133)

---

## FAQ

### Q: Should I use `defaultDimensionSequence` or `breakdownMap`?

**A:** It depends:

- **Simple, fixed hierarchy** (e.g., Region → Category → Product) → `defaultDimensionSequence`
- **Need per-node control** (e.g., different breakdowns for different regions) → `breakdownMap`
- **Not sure yet** → Start with `defaultDimensionSequence`, migrate to `breakdownMap` later if needed

### Q: Can I change the breakdown dynamically?

**A:** Yes! Use the `useCubeState` hook:

```typescript
cubeState.setGroupBreakdown(group, "newDimension", ancestorPath);
```

This updates the `breakdownMap` for that specific node.

### Q: What if I set both `defaultDimensionSequence` and `breakdownMap`?

**A:** `breakdownMap` takes precedence. The `defaultDimensionSequence` is only used if `breakdownMap` is undefined.

### Q: Will the old `groupBy` still work?

**A:** No, it's been removed. You must migrate to `defaultDimensionSequence` or `breakdownMap`.

---

## Examples

### Example 1: Simple Sales Hierarchy

```typescript
const config: CubeConfig = {
  data: salesData,
  dimensions: [region, category, product],
  measures: [revenue, profit],
  defaultDimensionSequence: ["region", "category", "product"],
};
```

Result: Every region → category → product

---

### Example 2: Different Breakdowns by Region

```typescript
const config: CubeConfig = {
  data: salesData,
  dimensions: [region, category, product, salesperson],
  measures: [revenue, profit],
  breakdownMap: {
    "": "region",
    "region:North": "category",
    "region:North|category:*": "product",
    "region:South": "salesperson",
    "region:South|salesperson:*": "product",
  },
};
```

Result:

- North → Category → Product
- South → Salesperson → Product

---

### Example 3: Dynamic with `useCubeState`

```typescript
const cubeState = useCubeState({
  data: salesData,
  dimensions: [region, category, product, salesperson],
  measures: [revenue],
  initialRootDimension: "region",
});

// Later, user clicks "Break down by category" on North region card
cubeState.setGroupBreakdown(northGroup, "category", []);

// Later, user clicks "Break down by salesperson" on South region card
cubeState.setGroupBreakdown(southGroup, "salesperson", []);
```

Result: Same as Example 2, but built interactively!

---

## Summary

**Old:**

- `groupBy: string[]` → Fixed global hierarchy

**New:**

- `breakdownMap: BreakdownMap` → Flexible, per-node hierarchy (PRIMARY)
- `defaultDimensionSequence: string[]` → Convenience shorthand (converted to wildcards)

**Migration:**

- Replace `groupBy` with `defaultDimensionSequence` for simple cases
- Use `breakdownMap` or `useCubeState.setGroupBreakdown()` for advanced cases

**Why:**

- Clearer mental model
- One underlying system (breakdownMap)
- Better aligns with per-node breakdown feature
