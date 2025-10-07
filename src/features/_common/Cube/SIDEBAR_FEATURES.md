# Cube Sidebar: Multi-Dimensional Analytics Panel

## Overview

The sidebar provides a **sophisticated analytical overview** of your data at any zoom level, showing breakdowns across **all available dimensions** simultaneously.

## Features

### 1. 📊 Summary Metrics

- **Current level totals**: Shows aggregated measures for the current zoom level
- **Relative progress bars**: Visual comparison between different measures
- **Percentage indicators**: Shows each measure as a percentage of the maximum value

### 2. 🔍 Multi-Dimensional Exploration

**The game-changer:** Instead of showing only the currently selected breakdown dimension, the sidebar shows **all possible breakdowns simultaneously**.

#### Example Scenario:

**Data:** Sales transactions  
**Available dimensions:** Region, Category, Product, Salesperson  
**Current view:** Breakdown by Region (showing North, South, East, West)

**Traditional approach (old):**

- Sidebar shows: Only Region breakdown

**New approach:**

- Sidebar shows:
  - ✅ **Region** breakdown (4 groups)
  - ✅ **Category** breakdown (3 groups)
  - ✅ **Product** breakdown (12 groups)
  - ✅ **Salesperson** breakdown (8 groups)

### 3. 🎯 Interactive Dimension Cards

Each dimension card is **clickable** and shows:

- Dimension name and icon
- Number of unique groups
- Top 5 groups by value (sorted by first measure)
- Visual progress bars
- Active state indicator (checkmark for current breakdown)

**Click behavior:**

- Clicking a dimension card → Sets it as the breakdown for children
- Visual feedback: Highlighted border + checkmark when active

### 4. 🚀 Quick Zoom Navigation

Each bar in every breakdown is **clickable** for instant zoom-in:

**Hover effects:**

- Bar gets taller (1px → 1.5px)
- Color intensifies (lighter → darker indigo)
- ZoomIn icon appears
- Label gets bolder

**Click behavior:**

- Instantly zooms into that specific group
- Builds correct breadcrumb path
- Maintains zoom history

#### Example:

```
Current view: Root (all data)
Sidebar shows: "Category" dimension with bars for:
  - Electronics (45%)  ← Click this
  - Accessories (30%)
  - Clothing (25%)

Result: Zooms into Electronics, showing its children
```

### 5. 📈 Smart Grouping Display

**Top 5 + More:**

- Shows top 5 groups by aggregated value
- Displays "+N more" if there are additional groups
- Sorted by first active measure (e.g., revenue, hours, etc.)

**Percentage calculation:**

- Based on the **current level's total**
- All percentages sum to 100% (for all groups, not just top 5)

### 6. 🎨 Visual Design

**Color coding:**

- **Active dimension**: Indigo-50 background, indigo-200 ring, indigo-700 text
- **Inactive dimensions**: Hover shows slate-50 background
- **Progress bars**: Gradient from indigo-400 to indigo-600
- **Hover state**: Darker gradient (indigo-500 to indigo-700)

**Spacing:**

- Compact design to fit multiple dimensions
- Scrollable sidebar (max-height: calc(100vh - 2rem))
- 320px width (80 Tailwind units)

---

## Use Cases

### Use Case 1: Quick Comparison

**Goal:** Compare how data looks across different dimensions without changing the main view.

**How:**

1. Zoom into any level (e.g., "North" region)
2. Check sidebar to see:
   - Breakdown by Category: Electronics dominates
   - Breakdown by Salesperson: Alice has most sales
   - Breakdown by Product: Laptop Pro is top seller

**Benefit:** Instant insights across multiple perspectives simultaneously.

---

### Use Case 2: Exploratory Navigation

**Goal:** Explore data by jumping between different breakdown paths.

**How:**

1. Start at root
2. Sidebar shows all dimensions
3. Click "Electronics" in Category breakdown → Zoom in
4. Sidebar now shows: Product, Salesperson, Region (available for Electronics)
5. Click "Alice Johnson" in Salesperson breakdown → Zoom in
6. Continue exploring

**Benefit:** Fluid, non-linear exploration without using main view controls.

---

### Use Case 3: Dimension Discovery

**Goal:** Find which dimension provides the most interesting breakdown.

**How:**

1. Look at all dimension cards in sidebar
2. Compare group counts:
   - Region: 4 groups
   - Category: 3 groups
   - Product: 45 groups (!)
   - Salesperson: 12 groups
3. Click on "Product" to see detailed breakdown
4. Discover that a few products dominate

**Benefit:** Data-driven dimension selection based on actual distribution.

---

### Use Case 4: Quick Drill-Through

**Goal:** Jump directly to a specific data slice without expanding intermediate groups.

**How:**

1. At root level
2. See "Electronics" in Category sidebar (45% of total)
3. Click it → Immediately zoom to Electronics
4. See "Laptop Pro" in Product sidebar (70% of Electronics!)
5. Click it → Immediately zoom to Laptop Pro
6. Two clicks, two zoom levels

**Benefit:** Fast navigation to areas of interest.

---

## Technical Implementation

### Data Calculation

```typescript
// For each available dimension at current level:
const grouped = new Map<string, items[]>();
currentItems.forEach((item) => {
  const value = dimension.getValue(item);
  const key = dimension.getKey(value);
  grouped.set(key, [...items]);
});

// Calculate aggregated value for each group
const measure = measures[0]; // Use first measure
const aggregatedValue = measure.aggregate(
  items.map((item) => measure.getValue(item)),
);
```

### Zoom-In Logic

```typescript
onClick={() => {
  // Build breadcrumb for this specific group
  const breadcrumbItem: BreadcrumbItem = {
    dimensionId: dimension.id,
    dimensionValue: dimension.getValue(group.items[0]),
    dimensionKey: group.key,
    label: group.label,
    group: { /* group data */ },
  };

  // Zoom in with full path
  const fullPath = [...zoomPath, breadcrumbItem];
  onZoomIn?.(breadcrumbItem.group, fullPath);
}
```

### Dimension Selection

```typescript
onClick={() => {
  if (zoomPath.length === 0) {
    // Root level
    onDimensionChange?.(dimension.id, 0);
  } else {
    // Zoomed level - set breakdown for current group's children
    const currentBreadcrumb = zoomPath[zoomPath.length - 1];
    const ancestorPath = zoomPath.slice(0, -1);
    onGroupDimensionSelect?.(
      currentBreadcrumb.group,
      dimension.id,
      ancestorPath,
    );
  }
}
```

---

## Performance Considerations

### Calculation Scope

- Only calculates breakdowns for **available dimensions** (excludes ancestors)
- Uses **current level's data** (filtered to zoom level)
- Limits to **top 5 groups** per dimension

### Optimizations

- Uses `Map` for efficient grouping
- Single-pass aggregation per dimension
- No redundant calculations (data already filtered)

### Memory

- Stores minimal data (only top 5 groups per dimension)
- Reuses items from existing groups when possible
- Clears on zoom level change (via React key)

---

## Future Enhancements

### Potential Additions:

1. **Measure selector**: Choose which measure to visualize in breakdowns
2. **Sorting options**: Sort by value, alphabetically, or by count
3. **Expand top N**: User-configurable (show top 3, 5, 10)
4. **Mini sparklines**: Show trends over time for each group
5. **Compare mode**: Select multiple groups to compare side-by-side
6. **Filter from sidebar**: Click to add dimension filters
7. **Export breakdowns**: Download as CSV or image

### UI Improvements:

- Collapsible dimension cards for large datasets
- Search/filter dimension list
- Drag-to-reorder dimensions
- Pin favorite dimensions to top

---

## Summary

The enhanced sidebar transforms the Cube from a **single-perspective viewer** into a **multi-dimensional analytics dashboard**. Users can:

✅ See all possible data perspectives simultaneously  
✅ Click to switch between breakdown dimensions  
✅ Click bars to zoom into specific groups  
✅ Explore data fluidly without main view changes  
✅ Discover patterns across multiple dimensions at once

**Result:** A powerful, interactive analytics experience that rivals dedicated BI tools! 🎉
