# Migration to Functional Cube Widget

## What Changed

The Cube widget has been refactored from a class-based service to a functional approach:

### Before (Class-based)

```typescript
import { cubeService } from "@/features/_common/Cube";

// Using service instance
const cube = cubeService.calculateCube(config);
```

### After (Functional)

```typescript
import { cubeService } from "@/features/_common/Cube";
// OR
import { calculateCube } from "@/features/_common/Cube";

// Using default service instance (recommended)
const cube = cubeService.calculateCube(config);

// OR using function directly
const cube = calculateCube(config);
```

## New Location

All files moved from `src/services/front/CubeService/` to `src/features/_common/Cube/`:

- ✅ Consolidated into single feature directory
- ✅ Better organization
- ✅ Functional approach instead of classes

## New Imports

```typescript
// Before
import { CubeService, cubeService } from "@/services/front/CubeService";
import { CubeView } from "@/components/ui/cube-view";
import type { CubeConfig } from "@/services/front/CubeService/CubeService.types";

// After - everything from one place!
import {
  cubeService,
  calculateCube,
  CubeView,
  type CubeConfig,
  type DimensionDescriptor,
  type MeasureDescriptor,
} from "@/features/_common/Cube";
```

## API Changes

### Class Methods → Functions

| Before (Class)                   | After (Function)                                         |
| -------------------------------- | -------------------------------------------------------- |
| `cubeService.calculateCube(...)` | `calculateCube(...)` or `cubeService.calculateCube(...)` |
| `cubeService.getCellValue(...)`  | `getCellValue(...)` or `cubeService.getCellValue(...)`   |
| `cubeService.findGroups(...)`    | `findGroups(...)` or `cubeService.findGroups(...)`       |
| `cubeService.flattenGroups(...)` | `flattenGroups(...)` or `cubeService.flattenGroups(...)` |

### New Factory Function

```typescript
import { createCubeService } from "@/features/_common/Cube";

// Create custom service instance if needed
const myCubeService = createCubeService();
```

## Benefits

1. **No Classes**: Pure functional approach - easier to test and reason about
2. **Tree-shakeable**: Import only what you need
3. **Consolidated**: Everything in one place (`src/features/_common/Cube/`)
4. **Better organization**: Feature-based structure
5. **Same API**: The default `cubeService` instance works exactly the same way

## No Breaking Changes for Existing Code

If you were using `cubeService.calculateCube()`, it still works the same way! Just update your imports:

```typescript
// Old import
import { cubeService } from "@/services/front/CubeService";

// New import
import { cubeService } from "@/features/_common/Cube";

// Rest of your code stays the same!
const cube = cubeService.calculateCube(config);
```

## Recommended Migration Steps

1. Update imports from `@/services/front/CubeService` to `@/features/_common/Cube`
2. Update imports from `@/components/ui/cube-view` to `@/features/_common/Cube`
3. Optionally switch from `cubeService.method()` to direct function calls if you prefer
4. Test everything works

That's it!
