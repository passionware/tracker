/**
 * Sunburst Chart Component for Cube Visualization
 *
 * Displays a multi-level radial chart showing the hierarchical breakdown of cube data.
 * Works independently of zoom level, always showing the full hierarchy from root.
 */

import { useMemo, useState } from "react";
import { calculateCube } from "./CubeService.ts";
import type {
  CubeDataItem,
  CubeGroup,
  DimensionDescriptor,
  MeasureDescriptor,
} from "./CubeService.types.ts";
import type { CubeState } from "./useCubeState.ts";

interface SunburstNode {
  id: string;
  label: string;
  value: number;
  color: string;
  level: number;
  parent: string | null;
  group: CubeGroup;
  children: SunburstNode[];
  startAngle: number;
  endAngle: number;
  innerRadius: number;
  outerRadius: number;
  pathToNode: Array<{ dimensionId: string; dimensionValue: unknown }>; // Full path from root to this node
}

interface CubeSunburstProps {
  state: CubeState;
  measure: MeasureDescriptor<CubeDataItem, unknown>;
  dimensions: DimensionDescriptor<CubeDataItem, unknown>[];
  maxLevels?: number;
  rootData: CubeDataItem[]; // Always pass the original unfiltered data
}

const COLORS = [
  "#3b82f6", // blue-500
  "#8b5cf6", // violet-500
  "#ec4899", // pink-500
  "#f59e0b", // amber-500
  "#10b981", // emerald-500
  "#06b6d4", // cyan-500
  "#f97316", // orange-500
  "#6366f1", // indigo-500
];

/**
 * Convert cube groups hierarchy to sunburst nodes
 */
function buildSunburstNodes(
  groups: CubeGroup[],
  measure: MeasureDescriptor<CubeDataItem, unknown>,
  level: number = 0,
  parentId: string | null = null,
  colorOffset: number = 0,
  parentPath: Array<{ dimensionId: string; dimensionValue: unknown }> = [],
): SunburstNode[] {
  const nodes: SunburstNode[] = [];

  groups.forEach((group, index) => {
    const cell = group.cells.find((c) => c.measureId === measure.id);
    const value = typeof cell?.value === "number" ? Math.abs(cell.value) : 0;

    const nodeId = group.path || `${group.dimensionId}:${group.dimensionKey}`;
    const color = COLORS[(colorOffset + index) % COLORS.length];

    // Build full path to this node
    const pathToNode = [
      ...parentPath,
      { dimensionId: group.dimensionId, dimensionValue: group.dimensionValue },
    ];

    const node: SunburstNode = {
      id: nodeId,
      label: group.dimensionLabel,
      value,
      color,
      level,
      parent: parentId,
      group,
      children: [],
      startAngle: 0,
      endAngle: 0,
      innerRadius: 0,
      outerRadius: 0,
      pathToNode,
    };

    // Recursively build children if they exist
    if (group.subGroups && group.subGroups.length > 0) {
      node.children = buildSunburstNodes(
        group.subGroups,
        measure,
        level + 1,
        nodeId,
        colorOffset + index,
        pathToNode,
      );
    }

    nodes.push(node);
  });

  return nodes;
}

/**
 * Calculate angles and radii for sunburst layout
 */
function layoutSunburst(
  nodes: SunburstNode[],
  startAngle: number,
  endAngle: number,
  innerRadius: number,
  outerRadius: number,
  maxLevels: number,
): void {
  const totalValue = nodes.reduce((sum, node) => sum + node.value, 0);
  if (totalValue === 0) return;

  const levelHeight = (outerRadius - innerRadius) / maxLevels;

  let currentAngle = startAngle;

  nodes.forEach((node) => {
    const angleSize = ((endAngle - startAngle) * node.value) / totalValue;
    node.startAngle = currentAngle;
    node.endAngle = currentAngle + angleSize;
    node.innerRadius = innerRadius + node.level * levelHeight;
    node.outerRadius = node.innerRadius + levelHeight;

    // Layout children
    if (node.children.length > 0) {
      layoutSunburst(
        node.children,
        node.startAngle,
        node.endAngle,
        node.innerRadius + levelHeight,
        outerRadius,
        maxLevels,
      );
    }

    currentAngle += angleSize;
  });
}

/**
 * Flatten node tree to array for rendering
 */
function flattenNodes(nodes: SunburstNode[]): SunburstNode[] {
  const result: SunburstNode[] = [];
  nodes.forEach((node) => {
    result.push(node);
    if (node.children.length > 0) {
      result.push(...flattenNodes(node.children));
    }
  });
  return result;
}

/**
 * Create SVG path for a sunburst arc
 */
function createArcPath(
  startAngle: number,
  endAngle: number,
  innerRadius: number,
  outerRadius: number,
): string {
  const startAngleRad = (startAngle * Math.PI) / 180;
  const endAngleRad = (endAngle * Math.PI) / 180;

  const x1 = innerRadius * Math.cos(startAngleRad);
  const y1 = innerRadius * Math.sin(startAngleRad);
  const x2 = outerRadius * Math.cos(startAngleRad);
  const y2 = outerRadius * Math.sin(startAngleRad);
  const x3 = outerRadius * Math.cos(endAngleRad);
  const y3 = outerRadius * Math.sin(endAngleRad);
  const x4 = innerRadius * Math.cos(endAngleRad);
  const y4 = innerRadius * Math.sin(endAngleRad);

  const largeArc = endAngle - startAngle > 180 ? 1 : 0;

  return [
    `M ${x1} ${y1}`,
    `L ${x2} ${y2}`,
    `A ${outerRadius} ${outerRadius} 0 ${largeArc} 1 ${x3} ${y3}`,
    `L ${x4} ${y4}`,
    `A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${x1} ${y1}`,
    "Z",
  ].join(" ");
}

/**
 * Calculate max depth of hierarchy
 */
function getMaxDepth(groups: CubeGroup[], currentDepth: number = 0): number {
  if (!groups || groups.length === 0) return currentDepth;

  let maxDepth = currentDepth;
  groups.forEach((group) => {
    if (group.subGroups && group.subGroups.length > 0) {
      const childDepth = getMaxDepth(group.subGroups, currentDepth + 1);
      maxDepth = Math.max(maxDepth, childDepth);
    }
  });

  return maxDepth;
}

export function CubeSunburst({
  state,
  measure,
  dimensions,
  maxLevels = 4,
  rootData,
}: CubeSunburstProps) {
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  // Get current zoom path for highlighting
  const currentZoomPath = state.path;

  // Build sunburst data from ROOT data always (not filtered by zoom)
  const { allNodes, maxDepth } = useMemo(() => {
    // Calculate groups from the original root data, not the zoomed cube
    // We need to build the hierarchy from scratch using the root data
    if (!rootData || rootData.length === 0) {
      return { allNodes: [], maxDepth: 0 };
    }

    // Get the root dimension from the cube config
    const config = state.cube.config;
    const rootDimensionId = config.breakdownMap?.[""];

    if (!rootDimensionId) {
      return { allNodes: [], maxDepth: 0 };
    }

    // Build groups from root data using the same breakdown map
    const rootCube = calculateCube({
      data: rootData,
      dimensions: dimensions,
      measures: [measure],
      breakdownMap: config.breakdownMap || {},
    });

    const groups = rootCube.groups;

    if (groups.length === 0) {
      return { allNodes: [], maxDepth: 0 };
    }

    const depth = Math.min(getMaxDepth(groups) + 1, maxLevels);
    const sunburstNodes = buildSunburstNodes(groups, measure);

    // Layout the nodes
    const size = 200;
    const centerRadius = size * 0.2;
    layoutSunburst(sunburstNodes, -90, 270, centerRadius, size, depth);

    const flattened = flattenNodes(sunburstNodes);

    return {
      allNodes: flattened,
      maxDepth: depth,
    };
  }, [rootData, measure, maxLevels, dimensions, state.cube.config]);

  if (allNodes.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-sm text-slate-400">
        No data to visualize
      </div>
    );
  }

  const size = 200;
  const viewBox = `${-size} ${-size} ${size * 2} ${size * 2}`;

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

      <div className="relative">
        <svg
          viewBox={viewBox}
          className="w-full h-auto max-w-md mx-auto"
          style={{ maxHeight: "400px" }}
        >
          {/* Render arcs */}
          {allNodes.map((node) => {
            const isHovered = hoveredNode === node.id;

            // Check if this node is in the current zoom path
            const isInZoomPath = currentZoomPath.some(
              (pathItem) =>
                pathItem.dimensionId === node.group.dimensionId &&
                pathItem.dimensionValue === node.group.dimensionValue,
            );

            const path = createArcPath(
              node.startAngle,
              node.endAngle,
              node.innerRadius,
              node.outerRadius,
            );

            return (
              <g key={node.id}>
                <path
                  d={path}
                  fill={node.color}
                  opacity={
                    hoveredNode
                      ? isHovered
                        ? 1
                        : 0.3
                      : isInZoomPath
                        ? 1
                        : 0.85
                  }
                  stroke={isInZoomPath ? "#1e40af" : "white"}
                  strokeWidth={isInZoomPath ? 3 : 2}
                  className="transition-all duration-200 cursor-pointer"
                  onMouseEnter={() => setHoveredNode(node.id)}
                  onMouseLeave={() => setHoveredNode(null)}
                  onClick={(e) => {
                    e.stopPropagation();
                    // Zoom into this node using the pre-built path
                    if (node.pathToNode.length > 0) {
                      state.setZoomPath(node.pathToNode);
                    }
                  }}
                >
                  <title>
                    {node.label}:{" "}
                    {node.group.cells.find((c) => c.measureId === measure.id)
                      ?.formattedValue || node.value}
                  </title>
                </path>
              </g>
            );
          })}

          {/* Center label */}
          <text
            x={0}
            y={0}
            textAnchor="middle"
            dominantBaseline="middle"
            className="fill-slate-600 text-xs font-medium pointer-events-none"
          >
            {hoveredNode
              ? allNodes
                  .find((n) => n.id === hoveredNode)
                  ?.label.substring(0, 15)
              : rootData.length + " items"}
          </text>
        </svg>

        {/* Legend for hovered node */}
        {hoveredNode && (
          <div className="absolute bottom-0 left-0 right-0 bg-white/95 border rounded p-2 text-xs">
            {(() => {
              const node = allNodes.find((n) => n.id === hoveredNode);
              if (!node) return null;
              const cell = node.group.cells.find(
                (c) => c.measureId === measure.id,
              );
              return (
                <div className="space-y-1">
                  <div className="font-medium truncate">{node.label}</div>
                  <div className="text-slate-600">
                    {cell?.formattedValue || node.value}
                  </div>
                  <div className="text-slate-500">
                    {node.group.itemCount} items
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </div>

      {/* Dimension legend */}
      <div className="flex flex-wrap gap-2">
        {Array.from(new Set(allNodes.map((n) => n.group.dimensionId)))
          .slice(0, maxDepth)
          .map((dimId, index) => {
            const dimension = dimensions.find((d) => d.id === dimId);
            if (!dimension) return null;
            return (
              <div
                key={dimId}
                className="flex items-center gap-1.5 text-xs text-slate-600"
              >
                <div
                  className="w-3 h-3 rounded-full"
                  style={{
                    backgroundColor: COLORS[index % COLORS.length],
                    opacity: 0.6,
                  }}
                />
                <span>
                  {dimension.icon} {dimension.name}
                </span>
              </div>
            );
          })}
      </div>
    </div>
  );
}
