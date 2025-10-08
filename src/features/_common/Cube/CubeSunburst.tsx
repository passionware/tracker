/**
 * Sunburst Chart Component for Cube Visualization
 *
 * Displays a multi-level radial chart showing the hierarchical breakdown of cube data.
 * Uses Nivo library for professional animations and interactions.
 * Always shows the full hierarchy from root, regardless of zoom level.
 */

import { ResponsiveSunburst } from "@nivo/sunburst";
import { useMemo } from "react";
import { calculateCube } from "./CubeService.ts";
import type {
  CubeDataItem,
  CubeGroup,
  DimensionDescriptor,
  MeasureDescriptor,
} from "./CubeService.types.ts";
import type { CubeState } from "./useCubeState.ts";

interface CubeSunburstProps {
  state: CubeState;
  measure: MeasureDescriptor<CubeDataItem, unknown>;
  dimensions: DimensionDescriptor<CubeDataItem, unknown>[];
  maxLevels?: number;
  rootData: CubeDataItem[];
}

interface NivoSunburstNode {
  id: string;
  name: string;
  value: number;
  children?: NivoSunburstNode[];
  // Custom properties for interactivity
  dimensionId?: string;
  dimensionValue?: unknown;
  path?: string;
  formattedValue?: string;
  itemCount?: number;
  originalLabel?: string; // Store the original readable label
}

/**
 * Convert CubeGroup hierarchy to Nivo sunburst data format
 */
function convertToNivoFormat(
  groups: CubeGroup[],
  measure: MeasureDescriptor<CubeDataItem, unknown>,
): NivoSunburstNode[] {
  return groups.map((group) => {
    const cell = group.cells.find((c) => c.measureId === measure.id);
    const value = typeof cell?.value === "number" ? Math.abs(cell.value) : 0;

    // Create unique ID using full path to avoid duplicate keys
    const uniqueId = group.path || `${group.dimensionId}:${group.dimensionKey}`;

    const node: NivoSunburstNode = {
      id: uniqueId,
      name: uniqueId, // Use unique ID as name to prevent duplicate keys
      value,
      dimensionId: group.dimensionId,
      dimensionValue: group.dimensionValue,
      path: group.path,
      formattedValue: cell?.formattedValue || String(value),
      itemCount: group.itemCount,
      originalLabel: group.dimensionLabel, // Store the original readable label
    };

    // Recursively convert children
    if (group.subGroups && group.subGroups.length > 0) {
      node.children = convertToNivoFormat(group.subGroups, measure);
    }

    return node;
  });
}

/**
 * Check if a node is in the current zoom path
 */
function isNodeInZoomPath(
  node: NivoSunburstNode,
  zoomPath: Array<{ dimensionId: string; dimensionValue: unknown }>,
): boolean {
  return zoomPath.some(
    (pathItem) =>
      pathItem.dimensionId === node.dimensionId &&
      pathItem.dimensionValue === node.dimensionValue,
  );
}

export function CubeSunburst({
  state,
  measure,
  dimensions,
  rootData,
}: CubeSunburstProps) {
  const currentZoomPath = state.path;

  // Build sunburst data from ROOT data always (not filtered by zoom)
  const nivoData = useMemo(() => {
    if (!rootData || rootData.length === 0) {
      return null;
    }

    const config = state.cube.config;
    const rootDimensionId = config.breakdownMap?.[""];

    if (!rootDimensionId) {
      return null;
    }

    // Calculate cube from root data
    const rootCube = calculateCube({
      data: rootData,
      dimensions: dimensions,
      measures: [measure],
      breakdownMap: config.breakdownMap || {},
    });

    if (rootCube.groups.length === 0) {
      return null;
    }

    // Convert to Nivo format
    const nivoNodes = convertToNivoFormat(rootCube.groups, measure);

    // Wrap in root node as required by Nivo with stable ID
    return {
      id: "sunburst-root",
      name: "All Data",
      value: 0, // Will be calculated from children
      children: nivoNodes,
    };
  }, [rootData, measure, dimensions, state.cube.config]);

  if (!nivoData) {
    return (
      <div className="flex items-center justify-center h-64 text-sm text-slate-400">
        No data to visualize
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-slate-700">
          Hierarchical Breakdown
        </h4>
        <div className="text-xs text-slate-500">
          {measure.icon} {measure.name}
        </div>
      </div>

      <div className="h-[400px] w-full">
        <ResponsiveSunburst
          key={`sunburst-${measure.id}`}
          data={nivoData}
          margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
          id="name"
          value="value"
          cornerRadius={2}
          borderWidth={1}
          borderColor={{ from: "color", modifiers: [["darker", 0.5]] }}
          colors={{ scheme: "set3" }}
          childColor={{
            from: "color",
            modifiers: [["brighter", 0.2]],
          }}
          enableArcLabels={true}
          arcLabel={(d) => {
            // Only show labels for larger arcs to reduce clutter
            const node = d.data as NivoSunburstNode;
            return d.percentage > 8 ? node.name : "";
          }}
          arcLabelsSkipAngle={15}
          arcLabelsTextColor="#ffffff"
          arcLabelsRadiusOffset={0.7}
          // Custom arc styling based on zoom path
          layers={[
            "arcs",
            "arcLabels",
            ({ nodes, arcGenerator }) => {
              // Custom layer to highlight zoomed path
              return (
                <g>
                  {nodes.map((node) => {
                    const nivoNode = node.data as NivoSunburstNode;
                    const isZoomed = isNodeInZoomPath(
                      nivoNode,
                      currentZoomPath,
                    );

                    if (!isZoomed || !node.arc) return null;

                    // Draw a highlighted border for zoomed nodes
                    const arc = arcGenerator(node.arc);
                    if (!arc) return null;

                    return (
                      <path
                        key={`highlight-${node.id}`}
                        d={arc}
                        fill="none"
                        stroke="#3b82f6"
                        strokeWidth={3}
                        opacity={0.9}
                        pointerEvents="none"
                      />
                    );
                  })}
                </g>
              );
            },
          ]}
          animate={true}
          motionConfig="gentle"
          transitionMode="centerRadius"
          onClick={(node) => {
            const nivoNode = node.data as NivoSunburstNode;

            // Don't zoom into root
            if (node.id === "sunburst-root") {
              // Click on root to reset zoom
              state.resetZoom();
              return;
            }

            // Build path from root to this node
            // Nivo doesn't give us the full path, so we need to reconstruct it
            // For now, we'll use a simpler approach: zoom to this specific node
            if (nivoNode.dimensionId && nivoNode.dimensionValue !== undefined) {
              // Parse the path from the node's path string if available
              if (nivoNode.path) {
                const pathSegments = nivoNode.path.split("|");
                const pathItems = pathSegments.map((segment) => {
                  const [dimensionId, key] = segment.split(":");
                  const dimension = dimensions.find(
                    (d) => d.id === dimensionId,
                  );

                  // Try to find the actual value from root data
                  if (dimension) {
                    const foundItem = rootData.find((item) => {
                      const itemValue = dimension.getValue(item);
                      const itemKey = dimension.getKey
                        ? dimension.getKey(itemValue)
                        : String(itemValue ?? "null");
                      return itemKey === key;
                    });

                    if (foundItem) {
                      return {
                        dimensionId,
                        dimensionValue: dimension.getValue(foundItem),
                      };
                    }
                  }

                  return {
                    dimensionId,
                    dimensionValue: key,
                  };
                });

                state.setZoomPath(pathItems);
              }
            }
          }}
          tooltip={({ value, color, data }) => {
            const nivoNode = data as NivoSunburstNode;
            // Use the original readable label
            const displayName =
              nivoNode.id === "sunburst-root"
                ? "All Data"
                : nivoNode.originalLabel ||
                  nivoNode.id.split(":").pop() ||
                  nivoNode.id;

            return (
              <div className="bg-slate-900 border border-slate-700 rounded-lg shadow-xl p-3 max-w-xs">
                <div className="flex items-center gap-2 mb-3">
                  <div
                    className="w-4 h-4 rounded-full shrink-0 border-2 border-white/20"
                    style={{ backgroundColor: color }}
                  />
                  <div className="font-semibold text-white text-sm truncate">
                    {displayName}
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="bg-slate-800 rounded px-2 py-1">
                    <div className="text-slate-300 text-xs">
                      {measure.icon} {measure.name}
                    </div>
                    <div className="text-white font-bold text-sm">
                      {nivoNode.formattedValue || value}
                    </div>
                  </div>
                  {nivoNode.itemCount && (
                    <div className="text-slate-400 text-xs">
                      {nivoNode.itemCount} items
                    </div>
                  )}
                </div>
              </div>
            );
          }}
        />
      </div>

      <div className="flex items-center justify-between text-xs text-slate-500">
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-blue-500"></div>
          <span>Current zoom</span>
        </div>
        <div className="text-center">
          Click segments to zoom • Click center to reset
        </div>
      </div>
    </div>
  );
}
