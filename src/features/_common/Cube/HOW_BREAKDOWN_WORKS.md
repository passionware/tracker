# How Breakdown Dimensions Work

## The Question: "When I expand an item, which dimension is used for subgroups?"

The answer is determined by the **breakdownMap** (or the wildcard patterns generated from `defaultDimensionSequence`)!

## Mode 1: Simple Hierarchy (Using `defaultDimensionSequence`)

Uses `config.defaultDimensionSequence` - **fixed hierarchy with wildcard breakdown map**.

```typescript
const config = {
  data: salesData,
  dimensions: [region, category, product, salesperson],
  measures: [revenue, profit],
  defaultDimensionSequence: ["region", "category", "product"], // ← Convenience option
};
```

**Internally converted to:**

```typescript
breakdownMap: {
  "": "region",
  "region:*": "category",           // ← Wildcard!
  "region:*|category:*": "product", // ← Wildcard!
}
```

### How It Works:

```
Root
  ↓ breakdownMap[""] = "region"
├─ North (path: "region:North")
│    ↓ Matches "region:*" → uses "category"
│  ├─ Electronics (path: "region:North|category:Electronics")
│  │    ↓ Matches "region:*|category:*" → uses "product"
│  │  ├─ Laptop Pro
│  │  │    ↓ No match → no subgroups
│  │  └─ Monitor 4K
│  └─ Accessories
│       ↓ Matches "region:*|category:*" → uses "product"
│     ├─ Mouse
│     └─ Keyboard
└─ South (path: "region:South")
     ↓ Also matches "region:*" → uses "category"
   ├─ Electronics
   └─ Accessories
```

**Code:** `dimensionSequenceToBreakdownMap()` function (line 204-243)

```typescript
function dimensionSequenceToBreakdownMap(dimensionIds: string[]): BreakdownMap {
  const map: BreakdownMap = {};
  map[""] = dimensionIds[0];

  let pathPattern = "";
  for (let i = 0; i < dimensionIds.length - 1; i++) {
    const currentDimension = dimensionIds[i];
    const nextDimension = dimensionIds[i + 1];

    if (pathPattern === "") {
      pathPattern = `${currentDimension}:*`; // ← Wildcard
    } else {
      pathPattern += `|${currentDimension}:*`; // ← Wildcard
    }

    map[pathPattern] = nextDimension;
  }

  return map;
}
```

**Key:** Wildcards (`*`) match ANY value for that dimension, creating a fixed hierarchy.

---

## Mode 2: Per-Node (Flexible Breakdown)

Uses `config.breakdownMap` - **each node decides its own breakdown**.

```typescript
const config = {
  data: salesData,
  dimensions: [region, category, product, salesperson],
  measures: [revenue, profit],
  breakdownMap: {
    "": "region", // Root → use "region"
    "region:North": "category", // North → use "category"
    "region:South": "salesperson", // South → use "salesperson" (different!)
    "region:North|category:Electronics": "product",
  },
};
```

### How It Works:

```
Root
  ↓ breakdownMap[""] = "region"
├─ North (path: "region:North")
│    ↓ breakdownMap["region:North"] = "category"
│  ├─ Electronics (path: "region:North|category:Electronics")
│  │    ↓ breakdownMap["region:North|category:Electronics"] = "product"
│  │  ├─ Laptop Pro
│  │  │    ↓ No mapping in breakdownMap → no subgroups
│  │  └─ Monitor 4K
│  └─ Accessories (path: "region:North|category:Accessories")
│       ↓ No mapping in breakdownMap → no subgroups
└─ South (path: "region:South")
     ↓ breakdownMap["region:South"] = "salesperson"  ← DIFFERENT!
   ├─ Alice Johnson
   └─ Bob Smith
```

**Code:** `buildGroupsWithBreakdownMap()` function (line 116-202)

```typescript
// Line 160-162: Build path for this node
const nodePath = parentPath
  ? `${parentPath}|${dimensionId}:${key}`
  : `${dimensionId}:${key}`;

// Line 164-165: Look up what dimension to use for children
const childDimensionId = breakdownMap[nodePath];

// Line 172-185: If found, create subgroups with that dimension
const subGroups = childDimensionId
  ? buildGroupsWithBreakdownMap(
      items,
      childDimensionId, // ← Use the dimension from breakdownMap!
      breakdownMap,
      dimensions,
      measures,
      nodePath, // ← Pass path to children
      // ...
    )
  : undefined;

// Line 196-197: Store the path and child dimension in the group
groups.push({
  // ... other properties
  path: nodePath,
  childDimensionId, // ← What dimension this group's children use
});
```

**Key:** `breakdownMap[nodePath]` determines the next dimension.

---

## Visual Comparison

### Simple Mode (defaultDimensionSequence):

```
Config:
  defaultDimensionSequence: ["region", "category", "product"]

Effective breakdownMap:
  { "": "region", "region:*": "category", "region:*|category:*": "product" }

Result:
  North
    └─ Electronics    (matches "region:*|category:*" → uses "product")
       └─ Laptop
  South
    └─ Electronics    (matches "region:*|category:*" → uses "product")
       └─ Monitor
```

**Same hierarchy everywhere via wildcards** ✓

---

### Per-Node Mode (explicit breakdownMap):

```
Config:
  breakdownMap: {
    "": "region",
    "region:North": "category",
    "region:South": "salesperson",   ← Different!
  }

Result:
  North
    └─ Electronics
       └─ (choose any dimension for Electronics)
  South
    └─ Alice Johnson   ← Different breakdown!
       └─ (choose any dimension for Alice)
```

**Each node chooses independently** ✓

---

## How Users Set Breakdowns (Per-Node Mode)

### Option 1: Dropdown (Top Bar)

```
Root > North    [Break down children by: Category ▼]
```

Calls: `cubeState.setGroupBreakdown(northGroup, "category", [])`

Result:

```typescript
breakdownMap["region:North"] = "category";
```

### Option 2: Dimension Buttons (On Each Group)

```
┌─────────────────────────────────────────┐
│ 📍 North Region                         │
│ [Zoom In] [📦 Category] [🏷️ Product]   │
└─────────────────────────────────────────┘
```

Clicking "📦 Category" calls: `onGroupDimensionSelect(northGroup, "category", [])`

Result: Same as above!

---

## The Data Flow

1. **User Action:**

   ```typescript
   cubeState.setGroupBreakdown(northGroup, "category", []);
   ```

2. **State Updates:**

   ```typescript
   // useCubeState.ts (line 160-172)
   const nodePath = "region:North"; // Built from group + ancestor path
   setBreakdownMap({
     ...prev,
     "region:North": "category", // ← Added to map
   });
   ```

3. **Config Updates:**

   ```typescript
   config.breakdownMap = {
     "": "region",
     "region:North": "category", // ← New entry
   };
   ```

4. **Cube Recalculates:**

   ```typescript
   // calculateCube (line 311-328)
   const rootDimensionId = config.breakdownMap[""]; // "region"
   groups = buildGroupsWithBreakdownMap(
     filteredData,
     rootDimensionId,
     config.breakdownMap, // ← Contains our new mapping
     // ...
   );
   ```

5. **When Building North Group:**

   ```typescript
   // buildGroupsWithBreakdownMap (line 164-165)
   const nodePath = "region:North";
   const childDimensionId = breakdownMap["region:North"]; // "category" ✓

   // Line 172-185
   const subGroups = buildGroupsWithBreakdownMap(
     northItems,
     "category", // ← Uses category dimension!
     // ...
   );
   ```

6. **Result:**
   North now has subgroups: Electronics, Accessories, etc.

---

## Summary

**When you expand an item, the dimension used for subgroups is:**

### Simple Mode (defaultDimensionSequence):

- Uses wildcard patterns: `"dimension:*"` matches any value
- Same hierarchy for all branches
- Convenient for simple, fixed hierarchies
- Automatically converted to `breakdownMap` internally

### Per-Node Mode (breakdownMap):

- Determined by `breakdownMap[nodePath]` with fallback to wildcard patterns
- Can be different for each specific group
- Flexible, user-controlled hierarchy
- Set via dropdown or dimension buttons
- Stored as: `path` → `dimensionId` mapping
- Exact paths override wildcard patterns

**The magic happens in `buildGroupsWithBreakdownMap()` line 164-174:**

```typescript
// First try exact match
let childDimensionId = breakdownMap[nodePath];

if (!childDimensionId) {
  // Fall back to wildcard match
  const wildcardPath = parentPath
    ? `${parentPath}|${dimensionId}:*`
    : `${dimensionId}:*`;
  childDimensionId = breakdownMap[wildcardPath];
}
```

This lookup answers: "What dimension should I use for this group's children?"

- Exact paths (e.g., `"region:North"`) take precedence
- Wildcard patterns (e.g., `"region:*"`) provide defaults
