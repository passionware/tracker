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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import { SimpleTooltip } from "@/components/ui/tooltip.tsx";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronRight, Home, ZoomIn } from "lucide-react";
import { useEffect, useState } from "react";
import type {
  CubeCell,
  CubeDataItem,
  CubeGroup,
  CubeResult,
  DimensionDescriptor,
  MeasureDescriptor,
} from "./CubeService.types.ts";

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
  availableDrillDowns?: string[];
  enableRawDataView?: boolean;
  enableZoomIn?: boolean;
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
  availableDrillDowns,
  enableRawDataView = false,
  enableZoomIn = false,
  maxInitialDepth = 0,
  ancestorPath = [],
}: CubeGroupItemProps) {
  const hasSubGroups = group.subGroups && group.subGroups.length > 0;
  const hasRawData = enableRawDataView && group.items && group.items.length > 0;

  // Auto-show raw data if no sub-groups exist but raw data is available
  const shouldAutoShowRawData = hasRawData && !hasSubGroups;

  const [isExpanded, setIsExpanded] = useState(level < maxInitialDepth);
  const [showRawData, setShowRawData] = useState(shouldAutoShowRawData);

  const indent = level * 20;
  const dimension = dimensions.find((d) => d.id === group.dimensionId);

  const toggleExpansion = () => {
    const newExpanded = !isExpanded;
    setIsExpanded(newExpanded);
    if (!newExpanded) {
      // Collapsing - turn off raw data
      setShowRawData(false);
    } else if (shouldAutoShowRawData) {
      // Expanding and should auto-show raw data
      setShowRawData(true);
    }
    onGroupExpand?.(group, newExpanded);
  };

  const handleViewRawData = () => {
    if (showRawData) {
      setShowRawData(false);
      setIsExpanded(false);
    } else {
      setShowRawData(true);
      setIsExpanded(true);
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
              {/* Zoom in button */}
              {enableZoomIn && hasSubGroups && (
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

              {/* Raw data button - only show if there are also sub-groups */}
              {hasRawData && hasSubGroups && (
                <motion.div variants={buttonVariants}>
                  <SimpleTooltip title="View raw data items">
                    <Button
                      variant={showRawData ? "default" : "outline"}
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
              {hasSubGroups && (
                <motion.div variants={buttonVariants}>
                  <SimpleTooltip title="View sub-groups">
                    <Button
                      variant={
                        isExpanded && !showRawData ? "default" : "outline"
                      }
                      size="sm"
                      className="h-6 px-2 text-xs"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowRawData(false);
                        setIsExpanded(true);
                      }}
                    >
                      📂 Groups
                    </Button>
                  </SimpleTooltip>
                </motion.div>
              )}
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
                        availableDrillDowns={availableDrillDowns}
                        enableRawDataView={enableRawDataView}
                        enableZoomIn={enableZoomIn}
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
  availableDrillDowns,
  enableDimensionPicker = false,
  showGrandTotals = true,
  maxInitialDepth = 0,
  enableRawDataView = false,
  enableZoomIn = false,
  className,
}: CubeViewProps) {
  const config = cube.config;
  const measures = config.activeMeasures
    ? config.measures.filter((m) => config.activeMeasures!.includes(m.id))
    : config.measures;

  const appliedDimensions = config.groupBy || [];

  // Zoom state management
  const [zoomPath, setZoomPath] = useState<BreadcrumbItem[]>([]);
  const [displayGroups, setDisplayGroups] = useState<CubeGroup[]>(cube.groups);

  // Reset zoom when cube changes
  useEffect(() => {
    setZoomPath([]);
    setDisplayGroups(cube.groups);
  }, [cube]);

  // Handle zoom in - receives the full path from the child component
  const handleZoomIn = (group: CubeGroup, fullPath: BreadcrumbItem[]) => {
    setZoomPath(fullPath);
    setDisplayGroups(group.subGroups || []);
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
  const currentDimensionId = config.groupBy?.[zoomPath.length];
  const availableDimensions = config.dimensions.filter(
    (d) => !usedDimensionIds.includes(d.id),
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
              {zoomPath.map((breadcrumb, index) => (
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
                    {breadcrumb.label}
                  </Button>
                </div>
              ))}
            </div>

            {/* Dimension Picker */}
            {enableDimensionPicker && availableDimensions.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-600 whitespace-nowrap">
                  Break down by:
                </span>
                <Select
                  value={currentDimensionId || ""}
                  onValueChange={(value) => {
                    onDimensionChange?.(value, zoomPath.length);
                  }}
                >
                  <SelectTrigger className="h-7 w-[180px] text-xs">
                    <SelectValue placeholder="Select dimension..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableDimensions.map((dim) => (
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
          <motion.div
            className="w-64 flex-shrink-0"
            key={zoomPath.map((b) => b.dimensionKey).join("-") || "root"}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="sticky top-4">
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

                  {/* Mini sparkline-style breakdown chart */}
                  {displayGroups.length > 0 && displayGroups.length <= 10 && (
                    <div className="pt-4 border-t space-y-2">
                      <div className="text-xs font-medium text-slate-600">
                        Breakdown
                      </div>
                      <div className="space-y-1">
                        {displayGroups.slice(0, 5).map((group) => {
                          const firstCell = group.cells[0];
                          const numValue =
                            typeof firstCell?.value === "number"
                              ? firstCell.value
                              : 0;
                          const total =
                            zoomPath.length === 0
                              ? cube.grandTotals[0]?.value
                              : zoomPath[zoomPath.length - 1].group.cells[0]
                                  ?.value;
                          const totalNum =
                            typeof total === "number" ? total : 1;
                          const pct =
                            totalNum > 0 ? (numValue / totalNum) * 100 : 0;

                          return (
                            <div key={group.dimensionKey} className="space-y-1">
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-slate-700 truncate max-w-[140px]">
                                  {group.dimensionLabel}
                                </span>
                                <span className="text-slate-500 text-[10px]">
                                  {pct.toFixed(1)}%
                                </span>
                              </div>
                              <div className="w-full bg-slate-100 rounded-full h-1">
                                <div
                                  className="bg-gradient-to-r from-blue-400 to-blue-600 h-1 rounded-full transition-all duration-500"
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                        {displayGroups.length > 5 && (
                          <div className="text-xs text-slate-400 text-center pt-1">
                            +{displayGroups.length - 5} more
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Groups */}
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
                availableDrillDowns={availableDrillDowns}
                enableRawDataView={enableRawDataView}
                enableZoomIn={enableZoomIn}
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
