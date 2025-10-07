# Zoom-In Feature with Breadcrumb Navigation

## Overview

The Cube Widget now supports a "Zoom-In" feature that allows users to focus on a specific group and its sub-groups, making it easier to drill down into hierarchical data without losing context.

## Features

### 1. Zoom-In Button

- **Location**: Appears on each group card when `enableZoomIn={true}`
- **Icon**: 🔍 (ZoomIn icon from lucide-react)
- **Behavior**: When clicked, the selected group becomes the new "root", and only its sub-groups are displayed

### 2. Breadcrumb Navigation

- **Auto-display**: Breadcrumbs appear automatically when zoomed into a group
- **Navigation**: Click any breadcrumb to navigate back to that level
- **Root button**: Home icon (🏠) to return to the top level
- **Current level**: Highlighted with secondary variant

### 3. Smart UI Adjustments

- **Grand Totals**: Only shown at the root level (hidden when zoomed in)
- **Animations**: Smooth transitions using Framer Motion
- **Reset on Data Change**: Zoom state resets when cube data changes

## Usage

### Basic Example

```typescript
import { CubeView, cubeService, type CubeConfig } from "@/features/_common/Cube";

const config: CubeConfig<YourDataType> = {
  data: yourData,
  dimensions: yourDimensions,
  measures: yourMeasures,
  groupBy: ["region", "category", "product"],
  activeMeasures: ["revenue", "profit"],
};

const cube = cubeService.calculateCube(config);

<CubeView
  cube={cube}
  enableZoomIn={true}
  onZoomIn={(group, fullPath) => {
    console.log("Zoomed into:", group.dimensionLabel);
    console.log("Dimension path:", fullPath.map(b => `${b.dimensionId}=${b.label}`).join(" > "));
    // Example output: "region=North > category=Electronics > product=Laptop Pro"
  }}
/>
```

### With Raw Data Viewing

```typescript
<CubeView
  cube={cube}
  enableZoomIn={true}
  enableRawDataView={true}
  renderRawData={(items, group) => (
    <YourCustomDataTable items={items} />
  )}
/>
```

## Props

### New CubeView Props

| Prop           | Type                                                     | Default     | Description                                                      |
| -------------- | -------------------------------------------------------- | ----------- | ---------------------------------------------------------------- |
| `enableZoomIn` | `boolean`                                                | `false`     | Enable the zoom-in feature                                       |
| `onZoomIn`     | `(group: CubeGroup, fullPath: BreadcrumbItem[]) => void` | `undefined` | Callback when zooming into a group, includes full dimension path |

### New Types

```typescript
export interface BreadcrumbItem {
  dimensionId: string; // The dimension ID (e.g., "region", "category")
  dimensionValue: unknown; // The actual value (e.g., "North", "Electronics")
  dimensionKey: string; // The unique key for this value
  label: string; // Display label for the breadcrumb
  group: CubeGroup; // Reference to the group
}
```

The zoom path is essentially an array of dimension filters that represent the current focus:

```typescript
// Example path when zoomed into North > Electronics > Laptop Pro:
[
  { dimensionId: "region", dimensionValue: "North", label: "North" },
  {
    dimensionId: "category",
    dimensionValue: "Electronics",
    label: "Electronics",
  },
  { dimensionId: "product", dimensionValue: "Laptop Pro", label: "Laptop Pro" },
];
```

## User Experience

### Flow

1. **Initial View**: User sees all top-level groups
2. **Click "Zoom In"**: Group expands to fill the view, showing only its sub-groups
3. **Breadcrumbs Appear**: Navigation path is displayed at the top
4. **Navigate Back**: Click any breadcrumb to return to that level
5. **Return to Root**: Click the Home breadcrumb to see all groups again

### Visual Indicators

- **Zoom In button**: Appears next to Data and Groups buttons
- **Breadcrumb highlight**: Current level shown with secondary variant
- **Smooth animations**: All transitions use Framer Motion for polish

## Implementation Details

### State Management

```typescript
// Internal state in CubeView component
const [zoomPath, setZoomPath] = useState<BreadcrumbItem[]>([]);
const [displayGroups, setDisplayGroups] = useState<CubeGroup[]>(cube.groups);

// Each breadcrumb item contains:
// - dimensionId: which dimension we're filtering on
// - dimensionValue: the specific value we're filtering to
// - dimensionKey: unique key for the value
// - label: human-readable display text
// - group: reference to the CubeGroup

// Automatically resets when cube data changes
useEffect(() => {
  setZoomPath([]);
  setDisplayGroups(cube.groups);
}, [cube]);
```

### Breadcrumb Navigation Logic

```typescript
const handleBreadcrumbClick = (index: number) => {
  if (index === -1) {
    // Go to root
    setZoomPath([]);
    setDisplayGroups(cube.groups);
  } else {
    // Go to specific level
    const newPath = zoomPath.slice(0, index + 1);
    setZoomPath(newPath);
    const targetGroup = newPath[index].group;
    setDisplayGroups(targetGroup?.subGroups || cube.groups);
  }
};
```

## Examples

### Sales Data Hierarchy

```
Root (All Regions)
  ├─ North Region  [Zoom In] ──> Shows only North categories
  │   ├─ Electronics
  │   └─ Accessories
  └─ South Region  [Zoom In] ──> Shows only South categories
      ├─ Electronics
      └─ Furniture
```

### Project Time Tracking

```
Root (All Projects)
  ├─ Website Redesign [Zoom In] ──> Shows only users on this project
  │   ├─ John Smith
  │   │   └─ Frontend Development
  │   └─ Jane Doe
  │       └─ UI Design
  └─ Mobile App
      └─ ...
```

## Storybook Examples

See these stories for interactive demos:

- **Story 15**: `ZoomInNavigation` - Basic zoom-in with sales data
- Check `CubeView.stories.tsx` for more examples

## Benefits

1. **Reduced Clutter**: Focus on relevant data without scrolling past unrelated groups
2. **Clear Context**: Breadcrumbs show exactly where you are in the hierarchy
3. **Easy Navigation**: One click to go back to any previous level
4. **Better Performance**: Rendering fewer groups improves performance with large datasets
5. **Intuitive UX**: Familiar navigation pattern (breadcrumbs) used across many applications

## Compatibility

- ✅ Works with all existing cube features
- ✅ Compatible with raw data viewing
- ✅ Works with custom renderers
- ✅ Supports all cube configurations
- ✅ Responsive design

## Notes

- Grand totals are only shown at the root level (not when zoomed in)
- Zoom state automatically resets when cube data changes
- The level prop passed to sub-groups adjusts based on zoom depth
- All animations respect user's motion preferences
