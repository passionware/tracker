/**
 * Cube Tree Node Component
 *
 * Recursive component representing a single group in the cube hierarchy
 */

import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import { SimpleTooltip } from "@/components/ui/tooltip.tsx";
import type {
  CubeCell,
  CubeDataItem,
  CubeGroup,
  DimensionDescriptor,
  MeasureDescriptor,
} from "./CubeService.types.ts";
import type { CubeState, PathItem } from "./useCubeState.ts";
import { ChevronRight, ZoomIn } from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  expandVariants,
  chevronVariants,
  buttonGroupVariants,
  buttonVariants,
  dataContainerVariants,
} from "./cube.animations.ts";
import { maybe } from "@passionware/monads";

/**
 * Props for CubeTreeNode component
 */
export interface CubeTreeNodeProps {
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
  nodePath: PathItem[]; // Path from root TO this node (this node's address)
}

/**
 * Individual group item with expand/collapse and drill-down
 */
export function CubeTreeNode({
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
  nodePath,
}: CubeTreeNodeProps) {
  const hasSubGroups = group.subGroups && group.subGroups.length > 0;
  const hasRawData = enableRawDataView && group.items && group.items.length > 0;

  // Calculate available dimensions for this group's children
  // Exclude dimensions already used in this node's path
  const usedDimensions = nodePath.map((p) => p.dimensionId);
  const availableDimensionsForGroup = dimensions.filter(
    (d) => !usedDimensions.includes(d.id),
  );

  const [isExpanded, setIsExpanded] = useState(level < maxInitialDepth);

  const indent = level * 20;
  const dimension = dimensions.find((d) => d.id === group.dimensionId);

  // Auto-show raw data if no sub-groups exist but raw data is available

  // Using childDimensionId to track state:
  // - null = show raw data
  // - undefined = not set yet (use default: auto-show raw data if no subgroups)
  // - string = show breakdown by that dimension
  const showRawData = maybe.isAbsent(group.childDimensionId) && hasRawData;

  const toggleExpansion = () => {
    const newExpanded = !isExpanded;
    setIsExpanded(newExpanded);
  };

  const handleViewRawData = () => {
    if (!showRawData) {
      setIsExpanded(true);
    } else {
      setIsExpanded(!isExpanded);
      // Set childDimensionId to null to indicate raw data view
    }
    state.setNodeChildDimension(nodePath, null);
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
          {(hasRawData || hasSubGroups || enableZoomIn) && (
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
                        // Zoom into this group - nodePath already contains the full path to this node
                        state.setZoomPath(nodePath);
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
                          // Set the child dimension for this node
                          state.setNodeChildDimension(nodePath, dim.id);
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
                    // Build child's path: this node's path + the child node
                    const childNodePath = [
                      ...nodePath,
                      {
                        dimensionId: subGroup.dimensionId,
                        dimensionValue: subGroup.dimensionValue,
                      },
                    ];

                    return (
                      <CubeTreeNode
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
                        nodePath={childNodePath}
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
