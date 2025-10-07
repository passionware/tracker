/**
 * Cube State Hook
 *
 * Manages the state and interactions for a multidimensional cube.
 * Follows the react-stately/react-aria pattern for separation of state and presentation.
 */

import { useState, useMemo, useCallback } from "react";
import type {
  CubeConfig,
  CubeDataItem,
  DimensionDescriptor,
  MeasureDescriptor,
  CubeResult,
  CubeGroup,
  BreakdownMap,
  DimensionFilter,
} from "./CubeService.types.ts";
import { calculateCube } from "./CubeService.ts";
import type { BreadcrumbItem } from "./CubeView.tsx";

export interface UseCubeStateProps<TData extends CubeDataItem> {
  /** Raw data to analyze */
  data: TData[];
  /** Available dimensions */
  dimensions: DimensionDescriptor<TData, unknown>[];
  /** Available measures */
  measures: MeasureDescriptor<TData, unknown>[];
  /** Initial filters */
  initialFilters?: DimensionFilter[];
  /** Initial root dimension (for per-node mode) */
  initialRootDimension?: string;
  /**
   * Initial default dimension sequence (for simple hierarchies)
   * This is a convenience option for backward compatibility.
   * Use initialRootDimension + setGroupBreakdown for full control.
   * @deprecated Use initialRootDimension and dynamic breakdown instead
   */
  initialDefaultDimensionSequence?: string[];
  /** Active measures (defaults to all) */
  activeMeasures?: string[];
  /** Include items in groups (for raw data viewing) */
  includeItems?: boolean;
  /** Maximum depth for grouping */
  maxDepth?: number;
  /** Skip empty groups */
  skipEmptyGroups?: boolean;
}

export interface CubeState {
  /** Current cube result */
  cube: CubeResult;
  /** Current breakdown map (for per-node mode) */
  breakdownMap: BreakdownMap;
  /** Current filters */
  filters: DimensionFilter[];
  /** Current zoom path */
  zoomPath: BreadcrumbItem[];
  /** Set breakdown dimension for root */
  setRootDimension: (dimensionId: string) => void;
  /** Set breakdown dimension for a specific group */
  setGroupBreakdown: (
    group: CubeGroup,
    dimensionId: string,
    ancestorPath: BreadcrumbItem[],
  ) => void;
  /** Zoom into a group */
  zoomIn: (group: CubeGroup, fullPath: BreadcrumbItem[]) => void;
  /** Navigate to a specific level in zoom path */
  navigateToLevel: (index: number) => void;
  /** Reset to root */
  resetZoom: () => void;
  /** Add a filter */
  addFilter: (filter: DimensionFilter) => void;
  /** Remove a filter */
  removeFilter: (dimensionId: string) => void;
  /** Clear all filters */
  clearFilters: () => void;
  /** Update the entire breakdown map */
  setBreakdownMap: (map: BreakdownMap) => void;
}

/**
 * Hook for managing cube state
 */
export function useCubeState<TData extends CubeDataItem>(
  props: UseCubeStateProps<TData>,
): CubeState {
  const {
    data,
    dimensions,
    measures,
    initialFilters = [],
    initialRootDimension,
    initialDefaultDimensionSequence,
    activeMeasures,
    includeItems = true,
    maxDepth = 10,
    skipEmptyGroups = false,
  } = props;

  // State: Breakdown map (per-node breakdown configuration)
  const [breakdownMap, setBreakdownMap] = useState<BreakdownMap>(() => {
    const map: BreakdownMap = {};

    if (initialRootDimension) {
      // Per-node mode with initial root dimension
      map[""] = initialRootDimension;
    } else if (
      initialDefaultDimensionSequence &&
      initialDefaultDimensionSequence.length > 0
    ) {
      // Simple mode: Convert sequence to wildcard breakdown map
      map[""] = initialDefaultDimensionSequence[0];

      // Build wildcard patterns for subsequent levels
      let pathPattern = "";
      for (let i = 0; i < initialDefaultDimensionSequence.length - 1; i++) {
        const currentDimension = initialDefaultDimensionSequence[i];
        const nextDimension = initialDefaultDimensionSequence[i + 1];

        if (pathPattern === "") {
          pathPattern = `${currentDimension}:*`;
        } else {
          pathPattern += `|${currentDimension}:*`;
        }

        map[pathPattern] = nextDimension;
      }
    }

    return map;
  });

  // State: Filters
  const [filters, setFilters] = useState<DimensionFilter[]>(initialFilters);

  // State: Zoom path (for zoom navigation)
  const [zoomPath, setZoomPath] = useState<BreadcrumbItem[]>([]);

  // Calculate cube configuration
  const config: CubeConfig<TData> = useMemo(
    () => ({
      data,
      dimensions,
      measures,
      filters,
      breakdownMap,
      activeMeasures,
    }),
    [data, dimensions, measures, filters, breakdownMap, activeMeasures],
  );

  // Calculate cube result
  const cube = useMemo(
    () =>
      calculateCube(config, {
        includeItems,
        maxDepth,
        skipEmptyGroups,
      }),
    [config, includeItems, maxDepth, skipEmptyGroups],
  );

  // Set root dimension
  const setRootDimension = useCallback((dimensionId: string) => {
    setBreakdownMap((prev) => ({
      ...prev,
      "": dimensionId,
    }));
    // Reset zoom when changing root dimension
    setZoomPath([]);
  }, []);

  // Set breakdown for a specific group
  const setGroupBreakdown = useCallback(
    (group: CubeGroup, dimensionId: string, ancestorPath: BreadcrumbItem[]) => {
      // Build the path for this group
      const pathSegments = [
        ...ancestorPath.map((b) => `${b.dimensionId}:${b.dimensionKey}`),
        `${group.dimensionId}:${group.dimensionKey}`,
      ];
      const nodePath = pathSegments.join("|");

      setBreakdownMap((prev) => ({
        ...prev,
        [nodePath]: dimensionId,
      }));
    },
    [],
  );

  // Zoom in to a group
  const zoomIn = useCallback(
    (_group: CubeGroup, fullPath: BreadcrumbItem[]) => {
      setZoomPath(fullPath);
    },
    [],
  );

  // Navigate to specific level
  const navigateToLevel = useCallback((index: number) => {
    if (index === -1) {
      setZoomPath([]);
    } else {
      setZoomPath((prev) => prev.slice(0, index + 1));
    }
  }, []);

  // Reset zoom
  const resetZoom = useCallback(() => {
    setZoomPath([]);
  }, []);

  // Add filter
  const addFilter = useCallback((filter: DimensionFilter) => {
    setFilters((prev) => {
      // Remove existing filter for this dimension
      const filtered = prev.filter((f) => f.dimensionId !== filter.dimensionId);
      return [...filtered, filter];
    });
  }, []);

  // Remove filter
  const removeFilter = useCallback((dimensionId: string) => {
    setFilters((prev) => prev.filter((f) => f.dimensionId !== dimensionId));
  }, []);

  // Clear all filters
  const clearFilters = useCallback(() => {
    setFilters([]);
  }, []);

  return {
    cube,
    breakdownMap,
    filters,
    zoomPath,
    setRootDimension,
    setGroupBreakdown,
    zoomIn,
    navigateToLevel,
    resetZoom,
    addFilter,
    removeFilter,
    clearFilters,
    setBreakdownMap,
  };
}
