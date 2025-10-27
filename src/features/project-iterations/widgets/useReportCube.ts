/**
 * useReportCube Hook
 *
 * Encapsulates cube logic for a report, providing:
 * - Cube state
 * - Dimensions and measures
 * - All cube-related functionality
 *
 * Can be reused in both main view and export dialog
 */

import { useCubeState } from "@/features/_common/Cube/useCubeState.ts";
import { useCubeDefinitions } from "./CubeDefinitions";
import {
  transformReportData,
  type TransformedEntry,
} from "./reportCubeTransformation";
import type { GeneratedReportSource } from "@/api/generated-report-source/generated-report-source.api.ts";
import type { WithFrontServices } from "@/core/frontServices.ts";
import { useMemo } from "react";
import { deserializeCubeConfig } from "@/features/_common/Cube/serialization/CubeSerialization.ts";

export interface UseReportCubeProps {
  report: GeneratedReportSource;
  services: WithFrontServices["services"];
}

export interface UseReportCubeReturn {
  cubeState: ReturnType<typeof useCubeState>;
  serializableConfig: ReturnType<
    typeof useCubeDefinitions
  >["serializableConfig"];
  data: TransformedEntry[];
}

/**
 * Hook that provides all cube-related functionality for a report
 */
export function useReportCube({
  report,
  services,
}: UseReportCubeProps): UseReportCubeReturn {
  // Transform report data with all calculated values
  const transformedData = useMemo(() => transformReportData(report), [report]);

  // Get cube definitions (serializable config only - no deserialization!)
  const { serializableConfig } = useCubeDefinitions(report, services);

  // For now, we still need to deserialize to get runtime descriptors for useCubeState
  // TODO: Create a new hook that works directly with SerializableCubeConfig
  const cubeConfig = useMemo(() => {
    return deserializeCubeConfig(serializableConfig, transformedData as any[]);
  }, [serializableConfig, transformedData]);

  // Create cube state with transformed data
  const cubeState = useCubeState({
    data: transformedData,
    dimensions: cubeConfig.dimensions,
    measures: cubeConfig.measures,
    includeItems: true,
    rawDataDimension: {
      id: "raw-data",
      name: "Raw Data",
      icon: "Database",
      description: "View raw data entries",
      getValue: (item: any) => item.id || item,
    },
  });

  return {
    cubeState,
    serializableConfig,
    data: transformedData,
  };
}
