/**
 * Generic Cube View Component
 *
 * Renders a multidimensional cube with expandable groups and drill-down capabilities.
 */

import { motion } from "framer-motion";
import type { BreadcrumbItem } from "./CubeNavigation.tsx";
import { CubeNavigation } from "./CubeNavigation.tsx";
import type {
  CubeCell,
  CubeDataItem,
  CubeGroup,
  DimensionDescriptor,
  MeasureDescriptor,
} from "./CubeService.types.ts";
import { CubeTreeNode } from "./CubeTreeNode.tsx";
import type { CubeState } from "./useCubeState.ts";

/**
 * Props for CubeView component
 */
export interface CubeViewProps {
  /** Cube state from useCubeState hook */
  state: CubeState;
  /** Optional: Render custom content for a group header */
  renderGroupHeader?: (group: CubeGroup, level: number) => React.ReactNode;
  /** Optional: Render custom content for a cell */
  renderCell?: (cell: CubeCell, group: CubeGroup) => React.ReactNode;
  /** Optional: Render raw data items */
  renderRawData?: (items: CubeDataItem[], group: CubeGroup) => React.ReactNode;
  /** Optional: Maximum initial expansion depth (0 = all collapsed) */
  maxInitialDepth?: number;
  /** Optional: Enable zoom-in feature */
  enableZoomIn?: boolean;
  /** Optional: Custom class name */
  className?: string;
}

/**
 * Main CubeView component
 */
export function CubeView({
  state,
  renderGroupHeader,
  renderCell,
  renderRawData,
  maxInitialDepth = 0,
  enableZoomIn = true,
  className,
}: CubeViewProps) {
  const cube = state.cube;
  const config = cube.config;
  const measures = config.activeMeasures
    ? config.measures.filter((m) => config.activeMeasures!.includes(m.id))
    : config.measures;

  // Convert PathItem[] from state to BreadcrumbItem[] for view
  const zoomPath: BreadcrumbItem[] = state.path.map((pathItem) => {
    const dim = config.dimensions.find((d) => d.id === pathItem.dimensionId);
    const key = dim?.getKey
      ? dim.getKey(pathItem.dimensionValue)
      : String(pathItem.dimensionValue ?? "null");
    return {
      dimensionId: pathItem.dimensionId,
      dimensionKey: key,
    };
  });

  // Compute display groups based on current path
  // Always show the children of the current node (determined by childDimensionId)
  const displayGroups = (() => {
    if (zoomPath.length === 0) {
      // At root: show top-level groups
      return cube.groups;
    }
    // Zoomed in: the cube.groups already contains the children of the zoomed node
    // because the zoom logic in calculateCube filters data and builds groups for the zoomed perspective
    return cube.groups;
  })();

  return (
    <div className={className}>
      {/* Navigation Bar - always visible */}
      <CubeNavigation
        state={state}
        zoomPath={zoomPath}
        dimensions={config.dimensions}
      />

      {/* Main Content Area - with optional sidebar */}
      <div className="flex gap-4 h-full w-full min-h-0">
        {/* Groups or Raw Data */}
        <motion.div
          className="flex-1 space-y-3 min-w-0 overflow-auto"
          key={zoomPath.length} // Re-render when zoom level changes
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          {displayGroups.length === 0 ? (
            // No groups to display - check if we should show raw data
            cube.totalItems > 0 && cube.filteredData ? (
              // Show raw data
              <motion.div
                className="space-y-4"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                {renderRawData ? (
                  renderRawData(cube.filteredData, {
                    dimensionId: "root",
                    dimensionValue: "root",
                    dimensionKey: "root",
                    dimensionLabel: "Root",
                    itemCount: cube.totalItems,
                    cells: cube.grandTotals,
                    subGroups: undefined,
                    items: cube.filteredData,
                    path: "",
                    childDimensionId: null,
                  })
                ) : (
                  <div className="bg-slate-50 rounded p-3 max-h-96 overflow-auto">
                    <pre className="text-xs">
                      {JSON.stringify(cube.filteredData, null, 2)}
                    </pre>
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.div
                className="text-center py-8 text-slate-500"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                No groups to display.{" "}
                {state.path.length > 0 &&
                  "Try selecting a different dimension or go back."}
              </motion.div>
            )
          ) : (
            displayGroups.map((group, idx) => {
              // Build this node's full path: current zoom path + this node
              const nodePath = [
                ...state.path,
                {
                  dimensionId: group.dimensionId,
                  dimensionValue: group.dimensionValue,
                },
              ];

              return (
                <CubeTreeNode
                  key={group.dimensionKey + idx}
                  group={group}
                  level={state.path.length}
                  state={state}
                  measures={measures as MeasureDescriptor<CubeDataItem>[]}
                  dimensions={
                    config.dimensions as DimensionDescriptor<CubeDataItem>[]
                  }
                  renderGroupHeader={renderGroupHeader}
                  renderCell={renderCell}
                  renderRawData={renderRawData}
                  enableZoomIn={enableZoomIn}
                  maxInitialDepth={maxInitialDepth}
                  nodePath={nodePath}
                />
              );
            })
          )}
        </motion.div>
      </div>
    </div>
  );
}
