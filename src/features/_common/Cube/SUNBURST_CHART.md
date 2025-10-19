# Sunburst Chart - Hierarchical Visualization

## Overview

The Sunburst Chart is a radial, multi-level visualization that displays hierarchical cube data in a circular layout. Built with **Nivo**, a professional React charting library, it provides smooth animations, beautiful interactions, and an intuitive way to understand data breakdowns at multiple levels simultaneously.

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

- **Smooth animations** - Gentle transitions powered by Nivo
- **Rich tooltips** - Professional tooltips with segment details, measure values, and item counts
- **Visual feedback** - Immediate highlighting on hover

#### Click to Zoom

- Click any segment to zoom into that level
- **Click root to reset** zoom and return to full view
- Automatically sets the zoom path in the cube
- Works seamlessly with the tree view navigation
- Current zoom path highlighted with **blue outline (4px)**

### 4. **Visual Indicators**

#### Color Coding

- **Nivo color scheme** - Professional, accessible color palette
- Child segments are brighter variations of parent colors
- Smooth color transitions through the hierarchy
- Dark borders for segment definition

#### Current Zoom Highlight

- Active zoom path segments have **blue stroke overlay (4px)**
- Smooth opacity transition (80%)
- Clearly distinguishes current context

### 5. **Measure Integration**

- Displays values based on the selected measure from the sidebar
- Shows formatted values in tooltips
- Updates automatically when measure changes

## Implementation Details

### Technology Stack

- **Nivo Library** (`@nivo/sunburst`, `@nivo/core`)
- Declarative React API
- Built on D3.js for robust data visualization
- Smooth animations via React Spring

### Data Flow

1. **Root Data Calculation**
   - Always recalculates cube from the original `rootData` (unfiltered)
   - Uses the same `breakdownMap` as the main cube
   - Independent of current zoom level

2. **Data Transformation**: `convertToNivoFormat()`
   - Recursively converts `CubeGroup[]` to Nivo's required format
   - Wraps data in root node for proper hierarchy
   - Preserves metadata (dimensionId, path, formattedValue)

3. **Rendering**: Nivo's `ResponsiveSunburst`
   - Automatic responsive sizing
   - Built-in arc calculations and layout
   - Configurable corner radius, borders, colors
   - Custom layers for zoom path highlighting

### Node Metadata

Each Nivo node includes custom properties:

```typescript
interface NivoSunburstNode {
  id: string;
  name: string;
  value: number;
  children?: NivoSunburstNode[];
  dimensionId?: string;
  dimensionValue?: unknown;
  path?: string; // Full path string for zoom reconstruction
  formattedValue?: string;
  itemCount?: number;
}
```

This enables accurate zoom and rich tooltips.

### Zoom Integration

Nivo's `onClick` handler:

```typescript
onClick={(node) => {
  // Click root to reset
  if (node.id === "root") {
    state.resetZoom();
    return;
  }

  // Parse path and reconstruct PathItem[]
  const pathItems = parseNodePath(node, dimensions, rootData);
  state.setZoomPath(pathItems);
}}
```

The cube state updates, triggering:

- Tree view to expand/collapse appropriately
- Breadcrumb navigation to update
- Data filtering and recalculation
- Sunburst highlights the new zoom path

## Usage

### In Cube Layout

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

- **Responsive** - Adapts to container width (400px height)
- **Corner radius** - 3px for modern look
- **Margins** - 10px all around for breathing room
- **Arc labels** - Smart display (only shown for arcs > 5%)

### Colors

- **Nivo color scheme** - Professional, accessible palette
- **Child color inheritance** - 13% brighter than parent
- **Border colors** - 30% darker than segment
- **Zoom highlight** - Blue (#1e40af) at 80% opacity

### Animations

- **Motion config** - "gentle" for smooth transitions
- **Transition mode** - "centerRadius" for radial animations
- **Powered by React Spring** - 60fps performance

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
