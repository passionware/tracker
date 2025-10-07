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
