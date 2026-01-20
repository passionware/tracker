/**
 * Multidimensional Cube Widget
 *
 * Export all cube-related functionality
 */

export {
  cubeService,
  createCubeService,
  calculateCube,
  getCellValue,
  getFormattedCellValue,
  findGroups,
  flattenGroups,
} from "./CubeService.ts";
export type { CubeService } from "./CubeService.ts";
export { CubeView } from "./CubeView.tsx";
export type { CubeViewProps } from "./CubeView.tsx";
export type { BreadcrumbItem } from "./CubeNavigation.tsx";
export type {
  CubeDataItem,
  DimensionDescriptor,
  MeasureDescriptor,
  FilterOperator,
  DimensionFilter,
  CubeConfig,
  CubeCell,
  CubeGroup,
  CubeResult,
  CubeCalculationOptions,
} from "./CubeService.types.ts";
export { useCubeState } from "./useCubeState.ts";
export type { UseCubeStateProps, CubeState, PathItem } from "./useCubeState.ts";
export type { TimeSubrange } from "./CubeService.types.ts";
export {
  CubeProvider,
  useCubeContext,
  useSelectedMeasure,
} from "./CubeContext.tsx";
export { findBreakdownDimensionId } from "./CubeUtils.ts";
export { CubeSunburst } from "./CubeSunburst.tsx";
export { CubeSummary } from "./CubeSummary.tsx";
export { CubeBreakdownControl } from "./CubeBreakdownControl.tsx";
export { CubeTimeSubrangeControl } from "./CubeTimeSubrangeControl.tsx";
export { CubeHierarchicalBreakdown } from "./CubeHierarchicalBreakdown.tsx";
export { CubeLayout } from "./CubeLayout.tsx";
export { CubeDimensionExplorer } from "./CubeDimensionExplorer.tsx";

// Debug components (development only)
export * from "./debug/index.ts";

// Serialization exports
export * from "./serialization/index.ts";
