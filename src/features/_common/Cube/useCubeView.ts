/**
 * Cube View Hook
 *
 * Manages the view state for displaying a cube (separate from data state).
 * Handles zoom navigation and group display.
 */

import { useState, useEffect } from "react";
import type { CubeGroup, CubeResult } from "./CubeService.types.ts";
import type { BreadcrumbItem } from "./CubeView.tsx";

export interface UseCubeViewProps {
  /** The cube result to display */
  cube: CubeResult;
  /** Current zoom path from cube state */
  zoomPath: BreadcrumbItem[];
}

export interface CubeViewState {
  /** Groups to display at current zoom level */
  displayGroups: CubeGroup[];
  /** Handle zoom in */
  handleZoomIn: (group: CubeGroup, fullPath: BreadcrumbItem[]) => void;
}

/**
 * Hook for managing cube view state (zoom and display)
 */
export function useCubeView(
  props: UseCubeViewProps,
  onZoomIn?: (group: CubeGroup, fullPath: BreadcrumbItem[]) => void,
): CubeViewState {
  const { cube, zoomPath } = props;

  // State: Display groups (filtered by zoom level)
  const [displayGroups, setDisplayGroups] = useState<CubeGroup[]>(cube.groups);

  // Update display groups when cube or zoom path changes
  useEffect(() => {
    if (zoomPath.length === 0) {
      // At root level
      setDisplayGroups(cube.groups);
    } else {
      // Zoomed in - get the target group's children
      const targetGroup = zoomPath[zoomPath.length - 1].group;
      if (targetGroup.subGroups && targetGroup.subGroups.length > 0) {
        setDisplayGroups(targetGroup.subGroups);
      } else {
        // Leaf node - show it as a single group so raw data can be displayed
        setDisplayGroups([targetGroup]);
      }
    }
  }, [cube, zoomPath]);

  // Handle zoom in
  const handleZoomIn = (group: CubeGroup, fullPath: BreadcrumbItem[]) => {
    // Call the external zoom handler (which updates cube state)
    onZoomIn?.(group, fullPath);
  };

  return {
    displayGroups,
    handleZoomIn,
  };
}
