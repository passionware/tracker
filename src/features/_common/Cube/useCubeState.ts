/**
 * Cube State Hook
 *
 * Manages the state and interactions for a multidimensional cube.
 * Follows the react-stately/react-aria pattern for separation of state and presentation.
 *
 * STATE DESIGN:
 * - Minimal normalized state
 * - No redundant data (no groups, no labels, no cube result in state)
 * - Derived data computed via useMemo
 */

import { useState, useMemo, useCallback } from "react";
import type {
  CubeConfig,
  CubeDataItem,
  DimensionDescriptor,
  MeasureDescriptor,
  CubeResult,
  DimensionFilter,
  TimeSubrange,
} from "./CubeService.types.ts";
import { calculateCube } from "./CubeService.ts";

/**
 * Normalized path item - stores only dimension ID and value
 */
export interface PathItem {
  dimensionId: string;
  dimensionValue: unknown;
}

/**
 * Node state - per-node UI state (stores ONLY explicit user overrides)
 */
export interface NodeState {
  isExpanded: boolean;
  childDimensionId?: string | null; // string = dimension, null = raw data, undefined = use default
  sortState?: {
    sortOptionId?: string;
    direction?: "asc" | "desc";
  };
}

/**
 * Node key - unique identifier for a node
 * Format: "dimensionId:value|dimensionId2:value2"
 */
type NodeKey = string;

export interface UseCubeStateProps<TData extends CubeDataItem> {
  /** Raw data to analyze */
  data: TData[];
  /** Available dimensions */
  dimensions: DimensionDescriptor<TData, unknown>[];
  /** Available measures */
  measures: MeasureDescriptor<TData, unknown>[];
  /** Initial filters */
  initialFilters?: DimensionFilter[];
  /** Active measures (defaults to all) */
  activeMeasures?: string[];
  /** Include items in groups (for raw data viewing) */
  includeItems?: boolean;
  /** Maximum depth for grouping */
  maxDepth?: number;
  /** Skip empty groups */
  skipEmptyGroups?: boolean;
  /** Dimension to use for raw data breakdown */
  rawDataDimension: DimensionDescriptor<TData, unknown>;
}

export interface CubeState {
  // ===== DERIVED DATA (computed) =====
  /** Current cube result (derived from state + data) */
  cube: CubeResult;

  // ===== NORMALIZED STATE =====
  /** Current path (zoom level) */
  path: PathItem[];
  /** Node states (expansion + child dimension per node) */
  nodeStates: Map<NodeKey, NodeState>;
  /** Current filters */
  filters: DimensionFilter[];
  /** Selected group IDs at current level */
  selectedGroupIds: string[];
  /** Time subrange for filtering data */
  timeSubrange: TimeSubrange | null;

  // ===== ACTIONS =====
  /** Set child dimension for a node (null = show raw data) */
  setNodeChildDimension: (path: PathItem[], dimensionId: string | null) => void;
  /** Set sort state for a node */
  setNodeSortState: (
    path: PathItem[],
    sortState: { sortOptionId?: string; direction?: "asc" | "desc" },
  ) => void;
  /** Set selected group IDs */
  setSelectedGroupIds: (selectedIds: string[]) => void;
  /** Toggle node expansion */
  toggleNodeExpansion: (path: PathItem[]) => void;
  /** Zoom into a node (set as root) */
  zoomIn: (pathItem: PathItem) => void;
  /** Set complete zoom path at once */
  setZoomPath: (path: PathItem[]) => void;
  /** Navigate to a specific level in path */
  navigateToLevel: (index: number) => void;
  /** Reset to root */
  resetZoom: () => void;
  /** Add a filter */
  addFilter: (filter: DimensionFilter) => void;
  /** Remove a filter */
  removeFilter: (dimensionId: string) => void;
  /** Clear all filters */
  clearFilters: () => void;
  /** Set time subrange (null to clear) */
  setTimeSubrange: (subrange: TimeSubrange | null) => void;
  /** Dimension to use for raw data breakdown */
  rawDataDimension: DimensionDescriptor<any, unknown>;
}

/**
 * Helper: Convert PathItem[] to NodeKey string
 */
function pathToKey(
  path: PathItem[],
  dimensions: DimensionDescriptor<any, unknown>[],
): NodeKey {
  return path
    .map((p) => {
      const dim = dimensions.find((d) => d.id === p.dimensionId);
      const key = dim?.getKey
        ? dim.getKey(p.dimensionValue)
        : String(p.dimensionValue ?? "null");
      return `${p.dimensionId}:${key}`;
    })
    .join("|");
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
    activeMeasures,
    includeItems = true,
    maxDepth = 10,
    skipEmptyGroups = false,
  } = props;

  // ===== NORMALIZED STATE =====

  // State: Path (where we are in the tree)
  const [path, setPath] = useState<PathItem[]>([]);

  // State: Node states - ONLY stores explicit user overrides (not defaults!)
  const [nodeStates, setNodeStates] = useState<Map<NodeKey, NodeState>>(
    () => new Map(),
  );

  // State: Filters
  const [filters, setFilters] = useState<DimensionFilter[]>(initialFilters);

  // State: Selected group IDs
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);

  // State: Time subrange
  const [timeSubrange, setTimeSubrange] = useState<TimeSubrange | null>(null);

  // ===== DERIVED DATA =====

  // Dimension priority order is derived from the dimensions array
  const dimensionPriority = useMemo(() => {
    return dimensions.map((d) => d.id);
  }, [dimensions]);

  // Calculate cube configuration
  const config: CubeConfig<TData> = useMemo(
    () => ({
      data,
      dimensions,
      measures,
      filters,
      nodeStates,
      initialGrouping: dimensionPriority,
      activeMeasures,
      timeSubrange,
    }),
    [
      data,
      dimensions,
      measures,
      filters,
      nodeStates,
      dimensionPriority,
      activeMeasures,
      timeSubrange,
    ],
  );

  // Calculate cube result (derived from state + data)
  const cube = useMemo(
    () =>
      calculateCube(config, {
        includeItems,
        maxDepth,
        skipEmptyGroups,
        zoomPath: path, // Pass the current zoom path
      }),
    [config, includeItems, maxDepth, skipEmptyGroups, path],
  );

  // ===== ACTIONS =====

  // Set child dimension for a node (null = show raw data, string = dimension)
  const setNodeChildDimension = useCallback(
    (nodePath: PathItem[], dimensionId: string | null) => {
      const key = pathToKey(nodePath, dimensions);
      setNodeStates((prev) => {
        const newMap = new Map(prev);
        const existing = newMap.get(key) || { isExpanded: false };
        newMap.set(key, { ...existing, childDimensionId: dimensionId });
        return newMap;
      });
    },
    [dimensions],
  );

  // Set sort state for a node
  const setNodeSortState = useCallback(
    (
      nodePath: PathItem[],
      sortState: { sortOptionId?: string; direction?: "asc" | "desc" },
    ) => {
      const key = pathToKey(nodePath, dimensions);
      setNodeStates((prev) => {
        const newMap = new Map(prev);
        const existing = newMap.get(key) || { isExpanded: false };
        newMap.set(key, { ...existing, sortState });
        return newMap;
      });
    },
    [dimensions],
  );

  // Toggle node expansion
  const toggleNodeExpansion = useCallback(
    (nodePath: PathItem[]) => {
      const key = pathToKey(nodePath, dimensions);
      setNodeStates((prev) => {
        const newMap = new Map(prev);
        const existing = newMap.get(key) || { isExpanded: false };
        newMap.set(key, { ...existing, isExpanded: !existing.isExpanded });
        return newMap;
      });
    },
    [dimensions],
  );

  // Zoom into a node (set as root)
  const zoomIn = useCallback((pathItem: PathItem) => {
    setPath((prev) => [...prev, pathItem]);
  }, []);

  // Set complete zoom path at once
  const setZoomPath = useCallback((newPath: PathItem[]) => {
    setPath(newPath);
  }, []);

  // Navigate to specific level
  const navigateToLevel = useCallback((index: number) => {
    if (index === -1) {
      setPath([]);
    } else {
      setPath((prev) => prev.slice(0, index + 1));
    }
  }, []);

  // Reset zoom
  const resetZoom = useCallback(() => {
    setPath([]);
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

  // Set time subrange
  const handleSetTimeSubrange = useCallback(
    (subrange: TimeSubrange | null) => {
      setTimeSubrange(subrange);
    },
    [],
  );

  return {
    cube,
    path,
    nodeStates,
    filters,
    selectedGroupIds,
    timeSubrange,
    setNodeChildDimension,
    setNodeSortState,
    setSelectedGroupIds,
    toggleNodeExpansion,
    zoomIn,
    setZoomPath,
    navigateToLevel,
    resetZoom,
    addFilter,
    removeFilter,
    clearFilters,
    setTimeSubrange: handleSetTimeSubrange,
    rawDataDimension: props.rawDataDimension,
  };
}
