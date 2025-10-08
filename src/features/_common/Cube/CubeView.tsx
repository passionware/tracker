/**
 * Generic Cube View Component
 *
 * Renders a multidimensional cube with expandable groups and drill-down capabilities.
 */

import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.tsx";
import { SimpleTooltip } from "@/components/ui/tooltip.tsx";
import { cn } from "@/lib/utils.ts";
import type {
  CubeCell,
  CubeDataItem,
  CubeGroup,
  DimensionDescriptor,
  MeasureDescriptor,
} from "./CubeService.types.ts";
import type { CubeState } from "./useCubeState.ts";
import { ChevronRight, ZoomIn, Home } from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";

/**
 * Animation variants for smooth transitions
 */
const expandVariants = {
  collapsed: {
    height: 0,
    opacity: 0,
    transition: {
      height: { duration: 0.2 },
      opacity: { duration: 0.15 },
    },
  },
  expanded: {
    height: "auto",
    opacity: 1,
    transition: {
      height: { duration: 0.3 },
      opacity: { duration: 0.2, delay: 0.1 },
    },
  },
};

const chevronVariants = {
  collapsed: {
    rotate: 0,
    transition: { duration: 0.2 },
  },
  expanded: {
    rotate: 90,
    transition: { duration: 0.2 },
  },
};

const buttonGroupVariants = {
  hidden: {
    opacity: 0,
    y: -10,
    transition: { duration: 0.15 },
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.2,
      delay: 0.1,
      staggerChildren: 0.05,
    },
  },
};

const buttonVariants = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.15 },
  },
};

const dataContainerVariants = {
  hidden: {
    opacity: 0,
    y: -20,
    transition: { duration: 0.2 },
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.3,
    },
  },
};

/**
 * Breadcrumb item for zoom navigation - stores only minimal data needed to identify a group
 */
export interface BreadcrumbItem {
  dimensionId: string;
  dimensionKey: string;
}

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
  /** Optional: Enable dimension picker */
  enableDimensionPicker?: boolean;
  /** Optional: Show grand totals */
  showGrandTotals?: boolean;
  /** Optional: Maximum initial expansion depth (0 = all collapsed) */
  maxInitialDepth?: number;
  /** Optional: Enable raw data viewing (requires includeItems in cube calculation) */
  enableRawDataView?: boolean;
  /** Optional: Enable zoom-in feature */
  enableZoomIn?: boolean;
  /** Optional: Custom class name */
  className?: string;
}

/**
 * Props for CubeGroupItem component
 */
interface CubeGroupItemProps {
  group: CubeGroup;
  level: number;
  state: CubeState;
  measures: MeasureDescriptor<CubeDataItem>[];
  dimensions: DimensionDescriptor<CubeDataItem>[];
  renderGroupHeader?: (group: CubeGroup, level: number) => React.ReactNode;
  renderCell?: (cell: CubeCell, group: CubeGroup) => React.ReactNode;
  renderRawData?: (items: CubeDataItem[], group: CubeGroup) => React.ReactNode;
  enableRawDataView?: boolean;
  enableZoomIn?: boolean;
  enableDimensionPicker?: boolean;
  maxInitialDepth?: number;
  currentPath: import("./useCubeState.ts").PathItem[];
}

/**
 * Individual group item with expand/collapse and drill-down
 */
function CubeGroupItem({
  group,
  level,
  state,
  measures,
  dimensions,
  renderGroupHeader,
  renderCell,
  renderRawData,
  enableRawDataView = false,
  enableZoomIn = false,
  enableDimensionPicker = false,
  maxInitialDepth = 0,
  currentPath,
}: CubeGroupItemProps) {
  const hasSubGroups = group.subGroups && group.subGroups.length > 0;
  const hasRawData = enableRawDataView && group.items && group.items.length > 0;

  // Calculate available dimensions for this group's breakdown
  // Exclude dimensions already used in the current path + this group's dimension
  const usedDimensions = [
    ...currentPath.map((p) => p.dimensionId),
    group.dimensionId,
  ];
  const availableDimensionsForGroup = dimensions.filter(
    (d) => !usedDimensions.includes(d.id),
  );

  const [isExpanded, setIsExpanded] = useState(level < maxInitialDepth);

  const indent = level * 20;
  const dimension = dimensions.find((d) => d.id === group.dimensionId);

  // Auto-show raw data if no sub-groups exist but raw data is available
  const shouldAutoShowRawData = hasRawData && !hasSubGroups;

  // Using childDimensionId to track state:
  // - null = show raw data
  // - undefined = not set yet (use default: auto-show raw data if no subgroups)
  // - string = show breakdown by that dimension
  const showRawData =
    (group.childDimensionId === null ||
      (group.childDimensionId === undefined && shouldAutoShowRawData)) &&
    hasRawData;

  const toggleExpansion = () => {
    const newExpanded = !isExpanded;
    setIsExpanded(newExpanded);
  };

  const handleViewRawData = () => {
    if (showRawData) {
      setIsExpanded(false);
    } else {
      setIsExpanded(true);
      // Set childDimensionId to null to indicate raw data view
      state.setNodeChildDimension(currentPath, null as any);
    }
  };

  return (
    <motion.div
      className="border rounded-lg overflow-hidden"
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      <div
        className="p-3 cursor-pointer hover:bg-slate-50 transition-colors border-l-4 border-blue-200"
        style={{ paddingLeft: `${12 + indent}px` }}
        onClick={toggleExpansion}
        data-group-key={`${group.dimensionId}:${group.dimensionKey}`}
      >
        {/* Main content row */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="w-4 h-4 flex items-center justify-center flex-shrink-0">
              {hasSubGroups && (
                <motion.div
                  variants={chevronVariants}
                  initial="collapsed"
                  animate={isExpanded ? "expanded" : "collapsed"}
                >
                  <ChevronRight className="w-3 h-3 text-slate-500" />
                </motion.div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              {renderGroupHeader ? (
                renderGroupHeader(group, level)
              ) : (
                <div className="flex items-center gap-2">
                  {dimension?.icon && <span>{dimension.icon}</span>}
                  <h4 className="font-medium truncate">
                    {group.dimensionLabel}
                  </h4>
                  <Badge variant="secondary" className="text-xs flex-shrink-0">
                    {group.itemCount} items
                  </Badge>
                </div>
              )}
            </div>
          </div>

          {/* Measures display */}
          <div className="flex items-center gap-3 flex-shrink-0">
            {group.cells.map((cell) => {
              const measure = measures.find((m) => m.id === cell.measureId);
              return (
                <div key={cell.measureId} className="text-right">
                  {renderCell ? (
                    renderCell(cell, group)
                  ) : (
                    <SimpleTooltip title={measure?.name || cell.measureId}>
                      <div className="text-sm">
                        {measure?.icon && (
                          <span className="mr-1">{measure.icon}</span>
                        )}
                        <span className="font-medium">
                          {cell.formattedValue}
                        </span>
                      </div>
                    </SimpleTooltip>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Drill-down, zoom, and raw data buttons */}
        <AnimatePresence>
          {(((hasRawData || hasSubGroups) && !shouldAutoShowRawData) ||
            enableZoomIn) && (
            <motion.div
              className="flex items-center gap-1 mt-2 ml-6"
              variants={buttonGroupVariants}
              initial="hidden"
              animate="visible"
              exit="hidden"
            >
              {/* Zoom in button - show for groups with subgroups OR raw data */}
              {enableZoomIn && (hasSubGroups || hasRawData) && (
                <motion.div variants={buttonVariants}>
                  <SimpleTooltip title="Zoom into this group">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-6 px-2 text-xs"
                      onClick={(e) => {
                        e.stopPropagation();
                        // Zoom into this group
                        state.zoomIn({
                          dimensionId: group.dimensionId,
                          dimensionValue: group.dimensionValue,
                        });
                      }}
                    >
                      <ZoomIn className="w-3 h-3 mr-1" />
                      Zoom In
                    </Button>
                  </SimpleTooltip>
                </motion.div>
              )}

              {/* Raw data button - show when raw data is available and not auto-showing it */}
              {hasRawData && (
                <motion.div variants={buttonVariants}>
                  <SimpleTooltip title="View raw data items">
                    <Button
                      variant={
                        isExpanded && showRawData ? "secondary" : "ghost"
                      }
                      size="sm"
                      className="h-6 px-2 text-xs"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleViewRawData();
                      }}
                    >
                      📊 Data
                    </Button>
                  </SimpleTooltip>
                </motion.div>
              )}

              {/* Show sub-groups button if they exist */}
              {hasSubGroups && !enableDimensionPicker && (
                <motion.div variants={buttonVariants}>
                  <SimpleTooltip title="View sub-groups">
                    <Button
                      variant={isExpanded && !showRawData ? "default" : "ghost"}
                      size="sm"
                      className="h-6 px-2 text-xs"
                      onClick={(e) => {
                        e.stopPropagation();
                        // Request to show sub-groups (not raw data)
                        // This should trigger parent to set childDimensionId to a dimension
                        setIsExpanded(true);
                      }}
                    >
                      📂 Groups
                    </Button>
                  </SimpleTooltip>
                </motion.div>
              )}

              {/* Dimension selection buttons */}
              {enableDimensionPicker &&
                availableDimensionsForGroup.length > 0 &&
                availableDimensionsForGroup.map((dim) => (
                  <motion.div key={dim.id} variants={buttonVariants}>
                    <SimpleTooltip title={`Break down by ${dim.name}`}>
                      <Button
                        size="sm"
                        className="h-6 px-2 text-xs"
                        variant={
                          isExpanded &&
                          !showRawData &&
                          group.childDimensionId === dim.id
                            ? "secondary"
                            : "ghost"
                        }
                        onClick={(e) => {
                          e.stopPropagation();
                          // Set the child dimension for this group
                          state.setNodeChildDimension(currentPath, dim.id);
                          if (group.childDimensionId !== dim.id) {
                            setIsExpanded(true);
                          } else {
                            setIsExpanded(!isExpanded);
                          }
                        }}
                      >
                        {dim.icon && <span className="mr-1">{dim.icon}</span>}
                        {dim.name}
                      </Button>
                    </SimpleTooltip>
                  </motion.div>
                ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Expanded content: raw data or sub-groups */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            className="border-t bg-white overflow-hidden"
            variants={expandVariants}
            initial="collapsed"
            animate="expanded"
            exit="collapsed"
          >
            <motion.div
              className="p-4"
              variants={dataContainerVariants}
              initial="hidden"
              animate="visible"
              exit="hidden"
            >
              {showRawData && hasRawData ? (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-medium text-slate-600">
                      Raw Data Items
                    </h4>
                    <Badge variant="secondary" className="text-xs">
                      {group.items!.length} items
                    </Badge>
                  </div>
                  {renderRawData ? (
                    renderRawData(group.items!, group)
                  ) : (
                    <div className="bg-slate-50 rounded p-3 max-h-96 overflow-auto">
                      <pre className="text-xs">
                        {JSON.stringify(group.items, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              ) : hasSubGroups ? (
                <div className="space-y-2">
                  {group.subGroups!.map((subGroup, idx) => {
                    // Build path for child including current group
                    const childPath = [
                      ...currentPath,
                      {
                        dimensionId: group.dimensionId,
                        dimensionValue: group.dimensionValue,
                      },
                    ];

                    return (
                      <CubeGroupItem
                        key={subGroup.dimensionKey + idx}
                        group={subGroup}
                        level={level + 1}
                        state={state}
                        measures={measures}
                        dimensions={dimensions}
                        renderGroupHeader={renderGroupHeader}
                        renderCell={renderCell}
                        renderRawData={renderRawData}
                        enableRawDataView={enableRawDataView}
                        enableZoomIn={enableZoomIn}
                        enableDimensionPicker={enableDimensionPicker}
                        maxInitialDepth={maxInitialDepth}
                        currentPath={childPath}
                      />
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-6 text-slate-400 text-sm">
                  No sub-groups or data available.
                  {hasRawData && " Click '📊 Data' to view raw entries."}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/**
 * Main CubeView component
 */
export function CubeView({
  state,
  renderGroupHeader,
  renderCell,
  renderRawData,
  enableDimensionPicker = true,
  showGrandTotals = true,
  maxInitialDepth = 0,
  enableRawDataView = true,
  enableZoomIn = true,
  className,
}: CubeViewProps) {
  const cube = state.cube;
  const config = cube.config;
  const measures = config.activeMeasures
    ? config.measures.filter((m) => config.activeMeasures!.includes(m.id))
    : config.measures;

  // Helper function to find a group in the cube by following a breadcrumb path
  const findGroupByPath = (
    breadcrumbs: BreadcrumbItem[],
  ): CubeGroup | undefined => {
    let currentGroups = cube.groups;
    let foundGroup: CubeGroup | undefined;

    for (const breadcrumb of breadcrumbs) {
      foundGroup = currentGroups.find(
        (g) =>
          g.dimensionKey === breadcrumb.dimensionKey &&
          g.dimensionId === breadcrumb.dimensionId,
      );

      if (!foundGroup) return undefined;
      currentGroups = foundGroup.subGroups || [];
    }

    return foundGroup;
  };

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
    // Zoomed in: show children of the current group
    const currentGroup = findGroupByPath(zoomPath);
    return currentGroup?.subGroups || [];
  })();

  // Handlers
  const handleBreadcrumbClick = (index: number) => {
    state.navigateToLevel(index);
  };

  const handleZoomIn = (group: CubeGroup, _fullPath: BreadcrumbItem[]) => {
    // Convert group to PathItem and zoom in
    state.zoomIn({
      dimensionId: group.dimensionId,
      dimensionValue: group.dimensionValue,
    });
  };

  // Get available dimensions for current level
  const usedDimensionIds = state.path.map((p) => p.dimensionId);

  // Current dimension shown in the groups (e.g., "region" if showing North, South, etc.)
  const currentGroupDimensionId = displayGroups[0]?.dimensionId;

  // Dimension used for children of these groups (what the dropdown should show/set)
  // If we have groups, check if they have a childDimensionId set
  const currentChildDimensionId = displayGroups[0]?.childDimensionId;

  // For the dropdown, we need to exclude:
  // 1. Dimensions used in the zoom path (ancestors)
  // Note: We DO show the current group's dimension in the sidebar (it's just not selectable in dropdown)
  const availableDimensions = config.dimensions.filter(
    (d) => !usedDimensionIds.includes(d.id),
  );

  // For the sidebar, show all dimensions that aren't in the ancestor path
  const sidebarDimensions = config.dimensions.filter(
    (d) => !usedDimensionIds.includes(d.id),
  );

  // For the dropdown, exclude the current group dimension
  const dropdownDimensions = availableDimensions.filter(
    (d) => d.id !== currentGroupDimensionId,
  );

  return (
    <div className={className}>
      {/* Navigation Bar - always visible when zoom or dimension picker enabled */}
      {(enableZoomIn || enableDimensionPicker) && (
        <motion.div
          className="mb-4 p-3 bg-slate-50 rounded-lg border"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          <div className="flex items-center justify-between gap-4 flex-wrap">
            {/* Breadcrumbs */}
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2"
                onClick={() => handleBreadcrumbClick(-1)}
              >
                <Home className="w-3 h-3 mr-1" />
                Root
              </Button>
              {zoomPath.map((breadcrumb, index) => {
                const dimension = config.dimensions.find(
                  (d) => d.id === breadcrumb.dimensionId,
                );
                // Derive the label from the group in the cube
                const group = findGroupByPath(zoomPath.slice(0, index + 1));
                const label = group?.dimensionLabel || breadcrumb.dimensionKey;

                return (
                  <div key={index} className="flex items-center gap-2">
                    <ChevronRight className="w-3 h-3 text-slate-400" />
                    <Button
                      variant={
                        index === zoomPath.length - 1 ? "secondary" : "ghost"
                      }
                      size="sm"
                      className="h-7 px-2"
                      onClick={() => handleBreadcrumbClick(index)}
                    >
                      {dimension?.icon && (
                        <span className="mr-1">{dimension.icon}</span>
                      )}
                      <span className="text-slate-500 font-normal">
                        {dimension?.name || breadcrumb.dimensionId}:
                      </span>
                      <span className="ml-1">{label}</span>
                    </Button>
                  </div>
                );
              })}
            </div>

            {/* Dimension Picker - show at all levels when zoomed in */}
            {enableDimensionPicker && dropdownDimensions.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-600 whitespace-nowrap">
                  {zoomPath.length === 0
                    ? "Break down by:"
                    : "Break down children by:"}
                </span>
                <Select
                  value={currentChildDimensionId ?? undefined}
                  onValueChange={(value) => {
                    // Set the child dimension for the current path
                    state.setNodeChildDimension(state.path, value);
                  }}
                >
                  <SelectTrigger className="h-7 w-[180px] text-xs">
                    <SelectValue placeholder="Select dimension..." />
                  </SelectTrigger>
                  <SelectContent>
                    {dropdownDimensions.map((dim) => (
                      <SelectItem
                        key={dim.id}
                        value={dim.id}
                        className="text-xs"
                      >
                        {dim.icon && <span className="mr-2">{dim.icon}</span>}
                        {dim.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* Main Content Area - with optional sidebar */}
      <div className="flex gap-4">
        {/* Summary Sidebar - shows totals for current zoom level */}
        {showGrandTotals && (
          <div className="w-80 flex-shrink-0">
            <Card className="sticky top-4 max-h-[calc(100vh-2rem)] overflow-y-auto">
              <CardHeader>
                <CardTitle className="text-base">
                  {(() => {
                    if (zoomPath.length === 0) return "Summary";
                    const currentGroup = findGroupByPath(zoomPath);
                    return currentGroup?.dimensionLabel || "Summary";
                  })()}
                </CardTitle>
                <CardDescription className="text-xs">
                  {zoomPath.length === 0 ? (
                    <>{cube.totalItems} items</>
                  ) : (
                    <>
                      {(() => {
                        const currentGroup = findGroupByPath(zoomPath);
                        return currentGroup?.itemCount || 0;
                      })()}{" "}
                      items in {zoomPath[zoomPath.length - 1].dimensionId}
                    </>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {(zoomPath.length === 0
                    ? cube.grandTotals
                    : findGroupByPath(zoomPath)?.cells || []
                  ).map((cell, _idx, arr) => {
                    const measure = measures.find(
                      (m) => m.id === cell.measureId,
                    );

                    // Calculate percentage of total for visual bar
                    const numValue =
                      typeof cell.value === "number" ? cell.value : 0;
                    const maxValue = Math.max(
                      ...arr.map((c) =>
                        typeof c.value === "number" ? c.value : 0,
                      ),
                    );
                    const percentage =
                      maxValue > 0 ? (numValue / maxValue) * 100 : 0;

                    return (
                      <div key={cell.measureId} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="text-xs text-slate-600 flex items-center gap-1">
                            {measure?.icon && <span>{measure.icon}</span>}
                            <span>{measure?.name || cell.measureId}</span>
                          </div>
                          {arr.length > 1 && (
                            <div className="text-xs text-slate-400">
                              {percentage.toFixed(0)}%
                            </div>
                          )}
                        </div>
                        <div className="font-semibold text-lg">
                          {cell.formattedValue}
                        </div>
                        {/* Visual progress bar */}
                        {arr.length > 1 && typeof cell.value === "number" && (
                          <div className="w-full bg-slate-100 rounded-full h-1.5">
                            <div
                              className="bg-blue-500 h-1.5 rounded-full transition-all duration-500"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Multi-dimensional breakdowns */}
                  {sidebarDimensions.length > 0 &&
                    (() => {
                      // Get current data items (either root or zoomed group)
                      const currentItems =
                        zoomPath.length === 0
                          ? config.data
                          : findGroupByPath(zoomPath)?.items || [];

                      if (!currentItems.length) return null;

                      // Calculate breakdowns for all available dimensions
                      return (
                        <div className="pt-4 border-t space-y-4">
                          <div className="text-xs font-medium text-slate-600">
                            Explore by Dimension
                          </div>

                          {sidebarDimensions.map((dimension) => {
                            // Group items by this dimension
                            const grouped = new Map<
                              string,
                              typeof currentItems
                            >();
                            currentItems.forEach((item: CubeDataItem) => {
                              const value = dimension.getValue(item);
                              const key = dimension.getKey
                                ? dimension.getKey(value)
                                : String(value ?? "null");
                              if (!grouped.has(key)) {
                                grouped.set(key, []);
                              }
                              grouped.get(key)!.push(item);
                            });

                            // Sort by size and take top 5
                            const sortedGroups = Array.from(grouped.entries())
                              .map(([key, items]) => {
                                const value = dimension.getValue(items[0]);
                                const label = dimension.formatValue
                                  ? dimension.formatValue(value)
                                  : String(value);

                                // Calculate measure value (use first measure)
                                const measure = measures[0];
                                const measureValues = items.map(
                                  (item: CubeDataItem) =>
                                    measure.getValue(item),
                                );
                                const aggregatedValue =
                                  measure.aggregate(measureValues);
                                const numValue =
                                  typeof aggregatedValue === "number"
                                    ? aggregatedValue
                                    : 0;

                                return { key, label, items, numValue };
                              })
                              .sort((a, b) => b.numValue - a.numValue);

                            const totalValue = sortedGroups.reduce(
                              (sum, g) => sum + g.numValue,
                              0,
                            );
                            const topGroups = sortedGroups.slice(0, 5);

                            // Check if this is the child dimension (what will be used for breakdown)
                            const isChildDimension =
                              currentChildDimensionId === dimension.id;

                            // Check if this is the currently displayed dimension (what we're viewing now)
                            const isDisplayedDimension =
                              currentGroupDimensionId === dimension.id;

                            return (
                              <div
                                key={dimension.id}
                                className={cn(
                                  "space-y-2 p-2 rounded-lg transition-all cursor-pointer",
                                  isChildDimension
                                    ? "bg-indigo-50 ring-2 ring-indigo-200"
                                    : isDisplayedDimension
                                      ? "bg-blue-50 ring-2 ring-blue-300"
                                      : "hover:bg-slate-50",
                                )}
                                onClick={() => {
                                  // Set this dimension as the breakdown for current level's children
                                  state.setNodeChildDimension(
                                    state.path,
                                    dimension.id,
                                  );
                                }}
                              >
                                <div className="flex items-center gap-1.5">
                                  {dimension.icon && (
                                    <span className="text-xs">
                                      {dimension.icon}
                                    </span>
                                  )}
                                  <span
                                    className={cn(
                                      "text-xs font-medium",
                                      isChildDimension
                                        ? "text-indigo-700"
                                        : isDisplayedDimension
                                          ? "text-blue-700"
                                          : "text-slate-700",
                                    )}
                                  >
                                    {dimension.name}
                                  </span>
                                  <span className="text-[10px] text-slate-400">
                                    ({grouped.size})
                                  </span>
                                  {isChildDimension && (
                                    <span
                                      className="ml-auto text-indigo-600"
                                      title="Child dimension"
                                    >
                                      <svg
                                        className="w-3 h-3"
                                        fill="currentColor"
                                        viewBox="0 0 20 20"
                                      >
                                        <path
                                          fillRule="evenodd"
                                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                          clipRule="evenodd"
                                        />
                                      </svg>
                                    </span>
                                  )}
                                  {isDisplayedDimension && (
                                    <span
                                      className="ml-auto text-blue-600"
                                      title="Currently viewing"
                                    >
                                      <svg
                                        className="w-3 h-3"
                                        fill="currentColor"
                                        viewBox="0 0 20 20"
                                      >
                                        <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                                        <path
                                          fillRule="evenodd"
                                          d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z"
                                          clipRule="evenodd"
                                        />
                                      </svg>
                                    </span>
                                  )}
                                </div>

                                <div className="space-y-1">
                                  {topGroups.map((group) => {
                                    const pct =
                                      totalValue > 0
                                        ? (group.numValue / totalValue) * 100
                                        : 0;

                                    return (
                                      <div
                                        key={group.key}
                                        className="space-y-0.5 group/item p-1 -mx-1 rounded transition-colors"
                                      >
                                        <div className="flex items-center justify-between text-[11px]">
                                          <span className="text-slate-600 truncate max-w-[120px]">
                                            {group.label}
                                          </span>
                                          <div className="flex items-center gap-1">
                                            <span className="text-slate-400">
                                              {pct.toFixed(0)}%
                                            </span>
                                            <button
                                              className="p-0.5 hover:bg-indigo-100 rounded transition-colors"
                                              onClick={(e) => {
                                                e.stopPropagation();

                                                // Calculate cells for all active measures
                                                const cells = measures.map(
                                                  (measure) => {
                                                    const values =
                                                      group.items.map(
                                                        measure.getValue,
                                                      );
                                                    const value =
                                                      measure.aggregate(values);
                                                    return {
                                                      measureId: measure.id,
                                                      value,
                                                      formattedValue:
                                                        measure.formatValue
                                                          ? measure.formatValue(
                                                              value,
                                                            )
                                                          : String(value),
                                                    };
                                                  },
                                                );

                                                // Build the breadcrumb for this specific group
                                                const breadcrumbItem: BreadcrumbItem =
                                                  {
                                                    dimensionId: dimension.id,
                                                    dimensionKey: group.key,
                                                  };

                                                // Build the actual CubeGroup for this synthetic group
                                                const syntheticGroup: CubeGroup =
                                                  {
                                                    dimensionId: dimension.id,
                                                    dimensionValue:
                                                      dimension.getValue(
                                                        group.items[0],
                                                      ),
                                                    dimensionKey: group.key,
                                                    dimensionLabel: group.label,
                                                    itemCount:
                                                      group.items.length,
                                                    cells,
                                                    items: group.items,
                                                  };

                                                // Pin (zoom into) this group
                                                // If this is a different dimension than currently displayed,
                                                // start a fresh path from root
                                                const fullPath =
                                                  dimension.id ===
                                                  currentGroupDimensionId
                                                    ? // Same dimension - append to current path
                                                      [
                                                        ...zoomPath,
                                                        breadcrumbItem,
                                                      ]
                                                    : // Different dimension - start fresh from root
                                                      [breadcrumbItem];
                                                handleZoomIn(
                                                  syntheticGroup,
                                                  fullPath,
                                                );
                                              }}
                                              title="Pin this group"
                                            >
                                              <ZoomIn className="w-3 h-3 text-slate-500 hover:text-indigo-700" />
                                            </button>
                                          </div>
                                        </div>
                                        <div className="w-full bg-slate-100 rounded-full h-1.5 flex items-center">
                                          <div
                                            className={cn(
                                              "h-1 rounded-full transition-all duration-500",
                                              isChildDimension
                                                ? "bg-gradient-to-r from-indigo-400 to-indigo-600"
                                                : isDisplayedDimension
                                                  ? "bg-gradient-to-r from-blue-400 to-blue-600"
                                                  : "bg-gradient-to-r from-slate-400 to-slate-600",
                                            )}
                                            style={{ width: `${pct}%` }}
                                          />
                                        </div>
                                      </div>
                                    );
                                  })}
                                  {grouped.size > 5 && (
                                    <div className="text-[10px] text-slate-400 text-right pt-0.5">
                                      +{grouped.size - 5} more
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Groups or Raw Data */}
        <motion.div
          className="flex-1 space-y-3"
          key={zoomPath.length} // Re-render when zoom level changes
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          {displayGroups.length === 0 ? (
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
          ) : (
            displayGroups.map((group, idx) => (
              <CubeGroupItem
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
                enableRawDataView={enableRawDataView}
                enableZoomIn={enableZoomIn}
                enableDimensionPicker={enableDimensionPicker}
                maxInitialDepth={maxInitialDepth}
                currentPath={state.path}
              />
            ))
          )}
        </motion.div>
      </div>
    </div>
  );
}
