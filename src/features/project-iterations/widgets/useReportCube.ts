/**
 * useReportCube Hook
 *
 * Encapsulates cube logic for a report, providing:
 * - Cube state
 * - Dimensions and measures
 * - Raw data dimension
 * - All cube-related functionality
 *
 * Can be reused in both main view and export dialog
 */

import { useCubeState } from "@/features/_common/Cube/useCubeState.ts";
import { useCubeDefinitions } from "./CubeDefinitions";
import type { GeneratedReportSource } from "@/api/generated-report-source/generated-report-source.api.ts";
import type { WithFrontServices } from "@/core/frontServices.ts";

export interface UseReportCubeProps {
  report: GeneratedReportSource;
  services: WithFrontServices["services"];
}

export interface UseReportCubeReturn {
  cubeState: ReturnType<typeof useCubeState>;
  dimensions: ReturnType<typeof useCubeDefinitions>["dimensions"];
  measures: ReturnType<typeof useCubeDefinitions>["measures"];
  rawDataDimension: ReturnType<typeof useCubeDefinitions>["rawDataDimension"];
  data: GeneratedReportSource["data"]["timeEntries"];
}

/**
 * Hook that provides all cube-related functionality for a report
 */
export function useReportCube({
  report,
  services,
}: UseReportCubeProps): UseReportCubeReturn {
  // Get cube definitions (dimensions, measures, raw data dimension)
  const { dimensions, measures, rawDataDimension } = useCubeDefinitions(
    report,
    services,
  );

  // Create cube state
  const cubeState = useCubeState({
    data: report.data.timeEntries,
    dimensions,
    measures,
    initialGrouping: ["project", "task", "contractor", "activity"],
    includeItems: true,
    rawDataDimension,
  });

  return {
    cubeState,
    dimensions,
    measures,
    rawDataDimension,
    data: report.data.timeEntries,
  };
}
