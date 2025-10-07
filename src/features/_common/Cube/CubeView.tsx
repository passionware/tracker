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
import type {
  CubeCell,
  CubeDataItem,
  CubeGroup,
  CubeResult,
  DimensionDescriptor,
  MeasureDescriptor,
} from "./CubeService.types.ts";
import { ChevronRight } from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

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
  /** Optional: Available dimensions for drill-down */
  availableDrillDowns?: string[]; // dimension IDs not yet used in groupBy
  /** Optional: Show grand totals */
  showGrandTotals?: boolean;
  /** Optional: Maximum initial expansion depth */
  maxInitialDepth?: number;
  /** Optional: Enable raw data viewing (requires includeItems in cube calculation) */
  enableRawDataView?: boolean;
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
  availableDrillDowns?: string[];
  enableRawDataView?: boolean;
  maxInitialDepth?: number;
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
  availableDrillDowns,
  enableRawDataView = false,
  maxInitialDepth = 1,
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
      setShowRawData(false);
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

        {/* Drill-down and raw data buttons */}
        <AnimatePresence>
          {(hasRawData || hasSubGroups) && !shouldAutoShowRawData && (
            <motion.div
              className="flex items-center gap-1 mt-2 ml-6"
              variants={buttonGroupVariants}
              initial="hidden"
              animate="visible"
              exit="hidden"
            >
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
                  {group.subGroups!.map((subGroup, idx) => (
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
                      availableDrillDowns={availableDrillDowns}
                      enableRawDataView={enableRawDataView}
                      maxInitialDepth={maxInitialDepth}
                    />
                  ))}
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
  availableDrillDowns,
  showGrandTotals = true,
  maxInitialDepth = 1,
  enableRawDataView = false,
  className,
}: CubeViewProps) {
  const config = cube.config;
  const measures = config.activeMeasures
    ? config.measures.filter((m) => config.activeMeasures!.includes(m.id))
    : config.measures;

  const appliedDimensions = config.groupBy || [];

  return (
    <div className={className}>
      {/* Grand Totals */}
      {showGrandTotals && (
        <Card className="mb-4">
          <CardHeader>
            <CardTitle>Summary</CardTitle>
            <CardDescription>Total items: {cube.totalItems}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {cube.grandTotals.map((cell) => {
                const measure = measures.find((m) => m.id === cell.measureId);
                return (
                  <div
                    key={cell.measureId}
                    className="text-center p-4 border rounded-lg"
                  >
                    <div className="text-sm text-slate-600 mb-1 flex items-center justify-center gap-1">
                      {measure?.icon && <span>{measure.icon}</span>}
                      <span>{measure?.name || cell.measureId}</span>
                    </div>
                    <div className="font-semibold text-lg">
                      {cell.formattedValue}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Groups */}
      <motion.div
        className="space-y-3"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        {cube.groups.length === 0 ? (
          <motion.div
            className="text-center py-8 text-slate-500"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            No data to display
          </motion.div>
        ) : (
          cube.groups.map((group, idx) => (
            <CubeGroupItem
              key={group.dimensionKey + idx}
              group={group}
              level={0}
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
              availableDrillDowns={availableDrillDowns}
              enableRawDataView={enableRawDataView}
              maxInitialDepth={maxInitialDepth}
            />
          ))
        )}
      </motion.div>
    </div>
  );
}
