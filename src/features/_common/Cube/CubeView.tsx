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
  CubeResult,
  DimensionDescriptor,
  MeasureDescriptor,
} from "./CubeService.types.ts";
import { ChevronRight, ZoomIn, Home } from "lucide-react";
import { useState, useEffect } from "react";
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
 * Breadcrumb item for zoom navigation
 */
export interface BreadcrumbItem {
  dimensionId: string;
  dimensionValue: unknown;
  dimensionKey: string;
  label: string;
  group: CubeGroup;
}

/**
 * Props for CubeView component
 */
export interface CubeViewProps {
  /** The calculated cube result */
  cube: CubeResult;
  /** Optional: Render custom content for a group header */
  renderGroupHeader?: (group: CubeGroup, level: number) => React.ReactNode;
  /** Optional: Render custom content for a cell */
  renderCell?: (cell: CubeCell, group: CubeGroup) => React.ReactNode;
  /** Optional: Render raw data items */
  renderRawData?: (items: CubeDataItem[], group: CubeGroup) => React.ReactNode;
  /** Optional: Callback when a group is expanded */
  onGroupExpand?: (group: CubeGroup, isExpanded: boolean) => void;
  /** Optional: Callback when drilling down into a group */
  onDrillDown?: (group: CubeGroup, newDimensionId: string) => void;
  /** Optional: Callback when viewing raw data */
  onViewRawData?: (group: CubeGroup) => void;
  /** Optional: Callback when zooming into a group */
  onZoomIn?: (group: CubeGroup, fullPath: BreadcrumbItem[]) => void;
  /** Optional: Callback when user changes breakdown dimension at current level */
  onDimensionChange?: (dimensionId: string, level: number) => void;
  /** Optional: Callback when user selects dimension for a specific group's breakdown (null = show raw data) */
  onGroupDimensionSelect?: (
    group: CubeGroup,
    dimensionId: string | null,
    ancestorPath: BreadcrumbItem[],
  ) => void;
  /** Optional: Available dimensions for drill-down */
  availableDrillDowns?: string[]; // dimension IDs not yet used in groupBy
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
  appliedDimensions: string[];
  measures: MeasureDescriptor<CubeDataItem>[];
  dimensions: DimensionDescriptor<CubeDataItem>[];
  renderGroupHeader?: (group: CubeGroup, level: number) => React.ReactNode;
  renderCell?: (cell: CubeCell, group: CubeGroup) => React.ReactNode;
  renderRawData?: (items: CubeDataItem[], group: CubeGroup) => React.ReactNode;
  onGroupExpand?: (group: CubeGroup, isExpanded: boolean) => void;
  onDrillDown?: (group: CubeGroup, newDimensionId: string) => void;
  onViewRawData?: (group: CubeGroup) => void;
  onZoomIn?: (group: CubeGroup, ancestorPath: BreadcrumbItem[]) => void;
  onGroupDimensionSelect?: (
    group: CubeGroup,
    dimensionId: string | null,
    ancestorPath: BreadcrumbItem[],
  ) => void;
  availableDrillDowns?: string[];
  enableRawDataView?: boolean;
  enableZoomIn?: boolean;
  enableDimensionPicker?: boolean;
  maxInitialDepth?: number;
  ancestorPath?: BreadcrumbItem[];
}

/**
 * Individual group item with expand/collapse and drill-down
 */
function CubeGroupItem({
  group,
  level,
  appliedDimensions,
  measures,
  dimensions,
  renderGroupHeader,
  renderCell,
  renderRawData,
  onGroupExpand,
  onDrillDown,
  onViewRawData,
  onZoomIn,
  onGroupDimensionSelect,
  availableDrillDowns,
  enableRawDataView = false,
  enableZoomIn = false,
  enableDimensionPicker = false,
  maxInitialDepth = 0,
  ancestorPath = [],
}: CubeGroupItemProps) {
  const hasSubGroups = group.subGroups && group.subGroups.length > 0;
  const hasRawData = enableRawDataView && group.items && group.items.length > 0;

  // Calculate available dimensions for this group's breakdown
  // Exclude dimensions already used in the ancestor path + this group's dimension
  const usedDimensions = [
    ...ancestorPath.map((b) => b.dimensionId),
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
    onGroupExpand?.(group, newExpanded);
  };

  const handleViewRawData = () => {
    if (showRawData) {
      setIsExpanded(false);
    } else {
      setIsExpanded(true);
      // Set childDimensionId to null to indicate raw data view
      onGroupDimensionSelect?.(group, null, ancestorPath);
      onViewRawData?.(group);
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
                        // Build full path including all ancestors
                        const currentBreadcrumb: BreadcrumbItem = {
                          dimensionId: group.dimensionId,
                          dimensionValue: group.dimensionValue,
                          dimensionKey: group.dimensionKey,
                          label: group.dimensionLabel,
                          group,
                        };
                        onZoomIn?.(group, [...ancestorPath, currentBreadcrumb]);
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
                          onGroupDimensionSelect?.(group, dim.id, ancestorPath);
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
                    const currentBreadcrumb: BreadcrumbItem = {
                      dimensionId: group.dimensionId,
                      dimensionValue: group.dimensionValue,
                      dimensionKey: group.dimensionKey,
                      label: group.dimensionLabel,
                      group,
                    };
                    const childPath = [...ancestorPath, currentBreadcrumb];

                    return (
                      <CubeGroupItem
                        key={subGroup.dimensionKey + idx}
                        group={subGroup}
                        level={level + 1}
                        appliedDimensions={[
                          ...appliedDimensions,
                          group.dimensionId,
                        ]}
                        measures={measures}
                        dimensions={dimensions}
                        renderGroupHeader={renderGroupHeader}
                        renderCell={renderCell}
                        renderRawData={renderRawData}
                        onGroupExpand={onGroupExpand}
                        onDrillDown={onDrillDown}
                        onViewRawData={onViewRawData}
                        onZoomIn={onZoomIn}
                        onGroupDimensionSelect={onGroupDimensionSelect}
                        availableDrillDowns={availableDrillDowns}
                        enableRawDataView={enableRawDataView}
                        enableZoomIn={enableZoomIn}
                        enableDimensionPicker={enableDimensionPicker}
                        maxInitialDepth={maxInitialDepth}
                        ancestorPath={childPath}
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
  cube,
  renderGroupHeader,
  renderCell,
  renderRawData,
  onGroupExpand,
  onDrillDown,
  onViewRawData,
  onZoomIn,
  onDimensionChange,
  onGroupDimensionSelect,
  availableDrillDowns,
  enableDimensionPicker = true,
  showGrandTotals = true,
  maxInitialDepth = 0,
  enableRawDataView = true,
  enableZoomIn = true,
  className,
}: CubeViewProps) {
  const config = cube.config;
  const measures = config.activeMeasures
    ? config.measures.filter((m) => config.activeMeasures!.includes(m.id))
    : config.measures;

  // Get list of applied dimensions from breakdownMap (extract unique dimension IDs)
  const appliedDimensions = config.breakdownMap
    ? Object.values(config.breakdownMap).filter(
        (v, i, arr) => arr.indexOf(v) === i,
      ) // unique
    : [];

  // Zoom state management
  const [zoomPath, setZoomPath] = useState<BreadcrumbItem[]>([]);
  const [displayGroups, setDisplayGroups] = useState<CubeGroup[]>(cube.groups);

  // Reset zoom and update display groups when cube changes
  useEffect(() => {
    if (zoomPath.length === 0) {
      // At root - just update groups
      setDisplayGroups(cube.groups);
    } else {
      // Zoomed in - need to find the corresponding group in new cube
      // and update displayGroups to match
      let currentGroups = cube.groups;

      // Navigate through the zoom path to find the current groups
      for (const breadcrumb of zoomPath) {
        const foundGroup = currentGroups.find(
          (g) =>
            g.dimensionKey === breadcrumb.dimensionKey &&
            g.dimensionId === breadcrumb.dimensionId,
        );

        if (foundGroup) {
          currentGroups = foundGroup.subGroups || [foundGroup];
        } else {
          // Path no longer valid - reset to root
          setZoomPath([]);
          setDisplayGroups(cube.groups);
          return;
        }
      }

      setDisplayGroups(currentGroups);
    }
  }, [cube, zoomPath]);

  // Handle zoom in - receives the full path from the child component
  const handleZoomIn = (group: CubeGroup, fullPath: BreadcrumbItem[]) => {
    setZoomPath(fullPath);
    // If the group has sub-groups, show them
    // Otherwise, show the leaf group itself so raw data can be displayed
    if (group.subGroups && group.subGroups.length > 0) {
      setDisplayGroups(group.subGroups);
    } else {
      // Leaf node - show it as a single group so raw data can be displayed
      setDisplayGroups([group]);
    }
    onZoomIn?.(group, fullPath);
  };

  // Handle breadcrumb navigation
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
      setDisplayGroups(targetGroup.subGroups || []);
    }
  };

  // Get available dimensions for current level
  const usedDimensionIds = zoomPath.map((b) => b.dimensionId);

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
                      <span className="ml-1">{breadcrumb.label}</span>
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
                    if (zoomPath.length === 0) {
                      // Root level - use onDimensionChange
                      onDimensionChange?.(value, zoomPath.length);
                    } else {
                      // Zoomed in - use onGroupDimensionSelect for current group
                      const currentBreadcrumb = zoomPath[zoomPath.length - 1];
                      const ancestorPath = zoomPath.slice(0, -1);
                      onGroupDimensionSelect?.(
                        currentBreadcrumb.group,
                        value,
                        ancestorPath,
                      );
                    }
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
                  {zoomPath.length === 0
                    ? "Summary"
                    : zoomPath[zoomPath.length - 1].label}
                </CardTitle>
                <CardDescription className="text-xs">
                  {zoomPath.length === 0 ? (
                    <>{cube.totalItems} items</>
                  ) : (
                    <>
                      {zoomPath[zoomPath.length - 1].group.itemCount} items in{" "}
                      {zoomPath[zoomPath.length - 1].dimensionId}
                    </>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {(zoomPath.length === 0
                    ? cube.grandTotals
                    : zoomPath[zoomPath.length - 1].group.cells
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
                          : zoomPath[zoomPath.length - 1].group.items || [];

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
                            currentItems.forEach((item) => {
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
                                const measureValues = items.map((item) =>
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
                                  if (zoomPath.length === 0) {
                                    onDimensionChange?.(dimension.id, 0);
                                  } else {
                                    const currentBreadcrumb =
                                      zoomPath[zoomPath.length - 1];
                                    const ancestorPath = zoomPath.slice(0, -1);
                                    onGroupDimensionSelect?.(
                                      currentBreadcrumb.group,
                                      dimension.id,
                                      ancestorPath,
                                    );
                                  }
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
                                                      group.items.map((item) =>
                                                        measure.getValue(item),
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
                                                    dimensionValue:
                                                      dimension.getValue(
                                                        group.items[0],
                                                      ),
                                                    dimensionKey: group.key,
                                                    label: group.label,
                                                    group: {
                                                      dimensionId: dimension.id,
                                                      dimensionValue:
                                                        dimension.getValue(
                                                          group.items[0],
                                                        ),
                                                      dimensionKey: group.key,
                                                      dimensionLabel:
                                                        group.label,
                                                      itemCount:
                                                        group.items.length,
                                                      cells,
                                                      items: group.items,
                                                    },
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
                                                  breadcrumbItem.group,
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
              No data to display
            </motion.div>
          ) : displayGroups.length === 1 &&
            !displayGroups[0].subGroups &&
            displayGroups[0].items &&
            displayGroups[0].items.length > 0 ? (
            // Zoomed into a leaf node - show raw data directly
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Raw Data</CardTitle>
                <CardDescription className="text-xs">
                  {displayGroups[0].items.length} items
                </CardDescription>
              </CardHeader>
              <CardContent>
                {renderRawData ? (
                  renderRawData(displayGroups[0].items, displayGroups[0])
                ) : (
                  <div className="bg-slate-50 rounded p-3 max-h-96 overflow-auto">
                    <pre className="text-xs">
                      {JSON.stringify(displayGroups[0].items, null, 2)}
                    </pre>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            displayGroups.map((group, idx) => (
              <CubeGroupItem
                key={group.dimensionKey + idx}
                group={group}
                level={zoomPath.length}
                appliedDimensions={appliedDimensions}
                measures={measures as MeasureDescriptor<CubeDataItem>[]}
                dimensions={
                  config.dimensions as DimensionDescriptor<CubeDataItem>[]
                }
                renderGroupHeader={renderGroupHeader}
                renderCell={renderCell}
                renderRawData={renderRawData}
                onGroupExpand={onGroupExpand}
                onDrillDown={onDrillDown}
                onViewRawData={onViewRawData}
                onZoomIn={enableZoomIn ? handleZoomIn : undefined}
                onGroupDimensionSelect={onGroupDimensionSelect}
                availableDrillDowns={availableDrillDowns}
                enableRawDataView={enableRawDataView}
                enableZoomIn={enableZoomIn}
                enableDimensionPicker={enableDimensionPicker}
                maxInitialDepth={maxInitialDepth}
                ancestorPath={zoomPath}
              />
            ))
          )}
        </motion.div>
      </div>
    </div>
  );
}
