/**
 * Cube Context for sharing cube state, dimensions, measures, and data across components
 *
 * This allows components to be decoupled and used in dashboard layouts while sharing
 * the same cube state, measurements, dimensions, and data.
 */

import { createContext, useContext, ReactNode, useState } from "react";
import type { CubeState } from "./useCubeState.ts";
import type {
  DimensionDescriptor,
  MeasureDescriptor,
  CubeDataItem,
} from "./CubeService.types.ts";
import { findBreakdownDimensionId } from "./CubeUtils.ts";

interface CubeContextValue {
  // Core cube state
  state: CubeState;

  // Report metadata
  reportId?: string;

  // Measure selection
  selectedMeasureId: string;
  setSelectedMeasureId: (measureId: string) => void;
}

const CubeContext = createContext<CubeContextValue | null>(null);

interface CubeProviderProps {
  children: ReactNode;
  value: Omit<CubeContextValue, "selectedMeasureId" | "setSelectedMeasureId">;
}

export function CubeProvider({ children, value }: CubeProviderProps) {
  const [selectedMeasureId, setSelectedMeasureId] = useState(
    value.state.cube.config.measures[0]?.id || "",
  );

  const contextValue: CubeContextValue = {
    ...value,
    selectedMeasureId,
    setSelectedMeasureId,
  };

  return (
    <CubeContext.Provider value={contextValue}>{children}</CubeContext.Provider>
  );
}

export function useCubeContext(): CubeContextValue {
  const context = useContext(CubeContext);
  if (!context) {
    throw new Error("useCubeContext must be used within a CubeProvider");
  }
  return context;
}

// Convenience hooks for specific parts of the context
export function useCubeState(): CubeState {
  return useCubeContext().state;
}

export function useCubeDimensions(): DimensionDescriptor<
  CubeDataItem,
  unknown
>[] {
  return useCubeContext().state.cube.config.dimensions;
}

export function useCubeMeasures(): MeasureDescriptor<CubeDataItem, unknown>[] {
  return useCubeContext().state.cube.config.measures;
}

export function useCubeData(): CubeDataItem[] {
  return useCubeContext().state.cube.config.data;
}

export function useSelectedMeasure(): {
  selectedMeasureId: string;
  setSelectedMeasureId: (measureId: string) => void;
  selectedMeasure: MeasureDescriptor<CubeDataItem, unknown>;
} {
  const { selectedMeasureId, setSelectedMeasureId, state } = useCubeContext();
  const measures = state.cube.config.measures;
  const selectedMeasure =
    measures.find((m) => m.id === selectedMeasureId) || measures[0];

  return {
    selectedMeasureId,
    setSelectedMeasureId,
    selectedMeasure,
  };
}

export function useCurrentBreakdownDimensionId(): string | null | undefined {
  const { state } = useCubeContext();
  const dimensions = state.cube.config.dimensions;

  const pathKey =
    state.path
      .map((p) => {
        const dim = dimensions.find((d) => d.id === p.dimensionId);
        const key = dim?.getKey
          ? dim.getKey(p.dimensionValue)
          : String(p.dimensionValue ?? "null");
        return `${p.dimensionId}:${key}`;
      })
      .join("|") || "";

  const breakdownId = findBreakdownDimensionId(
    pathKey,
    state.nodeStates,
    state.cube.config.dimensions.map((d) => d.id),
  );

  return breakdownId;
}
