# Sunburst Chart - Hierarchical Visualization

## Overview

The Sunburst Chart is a radial, multi-level visualization that displays hierarchical cube data in a circular layout. It provides an intuitive way to understand data breakdowns at multiple levels simultaneously.

## Features

### 1. **Multi-Level Hierarchy Display**

- Always shows the full hierarchy from root to leaf nodes (unaffected by zoom)
- Each ring represents a level in the hierarchy
- Automatically calculates and displays up to 4 levels (configurable)
- Current zoom path is highlighted with blue borders

### 2. **Proportional Sizing**

- Arc size is proportional to the selected measure value
- Uses absolute values for proper comparison
- Empty or zero-value groups are still visible but small

### 3. **Interactive Elements**

#### Hover Effects

- Highlights hovered segment
- Dims other segments for focus
- Shows tooltip with segment details
- Updates center label with segment name

#### Click to Zoom

- Click any segment to zoom into that level
- Automatically sets the zoom path in the cube
- Works seamlessly with the tree view navigation
- Current zoom path is highlighted with blue border

### 4. **Visual Indicators**

#### Color Coding

- Each root-level dimension gets a base color
- Child segments use variations of parent colors
- 8 distinct base colors cycle for variety

#### Current Zoom Highlight

- Active zoom path segments have blue stroke
- Thicker border (3px vs 2px) for emphasis
- Full opacity for zoomed segments

### 5. **Measure Integration**

- Displays values based on the selected measure from the sidebar
- Shows formatted values in tooltips
- Updates automatically when measure changes

## Implementation Details

### Data Flow

1. **Root Data Calculation**
   - Always recalculates cube from the original `rootData` (unfiltered)
   - Uses the same `breakdownMap` as the main cube
   - Independent of current zoom level

2. **Build Hierarchy**: `buildSunburstNodes()`
   - Recursively converts `CubeGroup[]` to `SunburstNode[]`
   - Tracks full path from root to each node
   - Calculates measure values for sizing

3. **Layout Calculation**: `layoutSunburst()`
   - Computes start/end angles based on value proportions
   - Calculates inner/outer radii for each level
   - Distributes 360° (actually -90° to 270° for top-start) among siblings

4. **Rendering**: SVG path generation
   - Creates arc paths using trigonometry
   - Handles large arc flag for >180° arcs
   - Applies colors, strokes, and opacity

### Path Tracking

Each node maintains `pathToNode`:

```typescript
pathToNode: Array<{
  dimensionId: string;
  dimensionValue: unknown;
}>;
```

This enables accurate zoom without path reconstruction.

### Zoom Integration

On click:

```typescript
onClick={(e) => {
  e.stopPropagation();
  if (node.pathToNode.length > 0) {
    state.setZoomPath(node.pathToNode);
  }
}}
```

The cube state updates, triggering:

- Tree view to expand/collapse appropriately
- Breadcrumb navigation to update
- Data filtering and recalculation

## Usage

### In CubeSidebar

```tsx
<CubeSunburst
  state={state}
  measure={selectedMeasure}
  dimensions={config.dimensions}
  rootData={config.data} // Important: pass original data
  maxLevels={4}
/>
```

### Props

- `state: CubeState` - Cube state from `useCubeState`
- `measure: MeasureDescriptor` - Which measure to visualize
- `dimensions: DimensionDescriptor[]` - Available dimensions for labels
- `rootData: CubeDataItem[]` - **Original unfiltered data** (always pass `config.data`)
- `maxLevels?: number` - Maximum hierarchy depth (default: 4)

## Visual Design

### Layout

- Center radius: 20% of total size
- Each level: Equal width ring
- Full circle: -90° to 270° (starts at top)

### Colors (Tailwind)

- Blue (#3b82f6)
- Violet (#8b5cf6)
- Pink (#ec4899)
- Amber (#f59e0b)
- Emerald (#10b981)
- Cyan (#06b6d4)
- Orange (#f97316)
- Indigo (#6366f1)

### States

- Default: 85% opacity
- Hovered: 100% opacity (others 30%)
- Zoomed: 100% opacity, blue border (3px)
- Other: 85% opacity, white border (2px)

## Future Enhancements

Potential improvements:

1. **Animation** - Smooth transitions when data changes
2. **Drill-up** - Click center to zoom out
3. **Legend** - Collapsible legend for dimensions
4. **Tooltips** - Rich tooltips with more metrics
5. **Export** - Download as SVG/PNG
6. **Comparison** - Side-by-side sunbursts for different measures

## Performance Considerations

- Uses `useMemo` for node calculation
- Flattens tree only once for rendering
- SVG paths generated on-demand
- No unnecessary re-renders on hover

## Accessibility

Current limitations:

- SVG title for basic screen reader support
- Could add ARIA labels
- Could add keyboard navigation
- Could add focus indicators
