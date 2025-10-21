/**
 * Cube View with Selection Support
 *
 * Wraps CubeView with SelectionLayout to enable checkbox selection
 * and shows selection-based measurements.
 */

import { SelectionLayout } from "@/features/_common/SelectionLayout.tsx";
import { Checkbox } from "@/components/ui/checkbox.tsx";
import { cubeService } from "./CubeService.ts";
import { CubeView } from "./CubeView.tsx";
import type { CubeState } from "./useCubeState.ts";
import type { CubeGroup } from "./CubeService.types.ts";
import { useMemo, useEffect } from "react";

/**
 * Props for CubeViewWithSelection component
 */
export interface CubeViewWithSelectionProps {
  /** Cube state from useCubeState hook */
  state: CubeState;
  /** Optional: Render custom content for a group header */
  renderGroupHeader?: (group: CubeGroup, level: number) => React.ReactNode;
  /** Optional: Render custom content for a cell */
  renderCell?: (cell: any, group: CubeGroup) => React.ReactNode;
  /** Optional: Render raw data items */
  renderRawData?: (items: any[], group: CubeGroup) => React.ReactNode;
  /** Optional: Maximum initial expansion depth (0 = all collapsed) */
  maxInitialDepth?: number;
  /** Optional: Enable zoom-in feature */
  enableZoomIn?: boolean;
  /** Optional: Custom class name */
  className?: string;
  /** Optional: Callback to receive selection measurements */
  onSelectionMeasurementsChange?: (measurements: any[] | null) => void;
}

/**
 * CubeView with selection support
 */
export function CubeViewWithSelection({
  state,
  renderGroupHeader,
  renderCell,
  renderRawData,
  maxInitialDepth = 0,
  enableZoomIn = true,
  className,
  onSelectionMeasurementsChange,
}: CubeViewWithSelectionProps) {
  // Calculate selection measurements
  const selectionMeasurements = useMemo(() => {
    if (state.selectedGroupIds.length === 0) {
      return null;
    }

    const currentGroups = state.cube.groups;
    return cubeService.calculateMeasurementsForSelection(
      currentGroups,
      state.selectedGroupIds,
      state.cube.config.measures,
    );
  }, [state.selectedGroupIds, state.cube.groups, state.cube.config.measures]);

  // Notify parent about selection measurements changes
  useEffect(() => {
    onSelectionMeasurementsChange?.(selectionMeasurements);
  }, [selectionMeasurements, onSelectionMeasurementsChange]);

  // Reset selection when zoom level changes
  useEffect(() => {
    // Clear selection whenever the path changes (zoom in/out)
    if (state.selectedGroupIds.length > 0) {
      state.setSelectedGroupIds([]);
    }
  }, [state.path, state.setSelectedGroupIds]);

  // Custom group header that includes checkboxes only for current zoom level
  const renderGroupHeaderWithCheckbox = (group: CubeGroup, level: number) => {
    const isSelected = state.selectedGroupIds.includes(group.dimensionKey);
    // The current zoom level corresponds to the path length
    // When path.length = 0 (root), level 0 is current zoom level
    // When path.length = 1 (zoomed in once), level 1 is current zoom level (the groups shown)
    const isCurrentZoomLevel = level === state.path.length;

    return (
      <div className="flex items-center gap-2">
        {isCurrentZoomLevel && (
          <Checkbox
            checked={isSelected}
            onCheckedChange={(checked) => {
              // Only allow selection of groups at current zoom level
              if (!isCurrentZoomLevel) return;

              if (checked) {
                state.setSelectedGroupIds([
                  ...state.selectedGroupIds,
                  group.dimensionKey,
                ]);
              } else {
                state.setSelectedGroupIds(
                  state.selectedGroupIds.filter(
                    (id) => id !== group.dimensionKey,
                  ),
                );
              }
            }}
            onClick={(e) => e.stopPropagation()}
          />
        )}
        {renderGroupHeader ? (
          renderGroupHeader(group, level)
        ) : (
          <div className="flex-1">
            <span className="font-medium">{group.dimensionLabel}</span>
            <span className="text-sm text-gray-500 ml-2">
              ({group.itemCount} items)
            </span>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={className}>
      {/* Cube View with Selection Layout */}
      <SelectionLayout
        selectedIds={state.selectedGroupIds}
        onSelectedIdsChange={state.setSelectedGroupIds}
      >
        <CubeView
          state={state}
          renderGroupHeader={renderGroupHeader || renderGroupHeaderWithCheckbox}
          renderCell={renderCell}
          renderRawData={renderRawData}
          maxInitialDepth={maxInitialDepth}
          enableZoomIn={enableZoomIn}
        />
      </SelectionLayout>
    </div>
  );
}
