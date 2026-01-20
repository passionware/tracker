/**
 * Cube Summary Component
 *
 * Displays summary statistics for the current zoom level or all data.
 * Shows measures with their calculated totals and formatted values.
 */

import { useCubeContext } from "@/features/_common/Cube/CubeContext.tsx";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import { ArrowUp } from "lucide-react";
import { cubeService } from "./CubeService.ts";
import { useMemo } from "react";

interface CubeSummaryProps {
  showNavigation?: boolean;
}

export function CubeSummary({ showNavigation = true }: CubeSummaryProps) {
  const { state } = useCubeContext();
  const measures = state.cube.config.measures;
  const cube = state.cube;

  // Get current zoom level data - use filteredData which respects time subrange
  // When at root level (no path), use filteredData instead of config.data to respect time subrange
  const currentItems = cube.filteredData;

  // Check if we have selection
  const hasSelection =
    state.selectedGroupIds && state.selectedGroupIds.length > 0;

  // Calculate selection measurements if we have a selection
  const selectionMeasurements = useMemo(() => {
    if (!hasSelection) return null;

    return cubeService.calculateMeasurementsForSelection(
      state.cube.groups,
      state.selectedGroupIds,
      measures,
    );
  }, [hasSelection, state.cube.groups, state.selectedGroupIds, measures]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-slate-700">
            Summary{" "}
            {hasSelection
              ? `(Selection - ${state.selectedGroupIds.length} groups)`
              : state.path.length > 0
                ? "(Current Level)"
                : "(All Data)"}
          </CardTitle>
          {showNavigation && state.path.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                // Go to parent by removing the last path item
                const parentPath = state.path.slice(0, -1);
                state.setZoomPath(parentPath);
              }}
              className="h-6 w-6 p-0"
              title="Go to parent"
            >
              <ArrowUp className="h-3 w-3" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {measures.map((measure) => {
          let totalValue: number;
          let formattedValue: string;

          if (hasSelection && selectionMeasurements) {
            // Use selection measurements
            const selectionCell = selectionMeasurements.find(
              (cell) => cell.measureId === measure.id,
            );
            if (selectionCell) {
              totalValue = Number(selectionCell.value) || 0;
              formattedValue = selectionCell.formattedValue || "0";
            } else {
              totalValue = 0;
              formattedValue = "0";
            }
          } else {
            // When at root level with no selection, use grandTotals which are already
            // calculated from filtered data (respects time subrange)
            if (state.path.length === 0) {
              const grandTotalCell = cube.grandTotals.find(
                (cell) => cell.measureId === measure.id,
              );
              if (grandTotalCell) {
                totalValue = Number(grandTotalCell.value) || 0;
                formattedValue = grandTotalCell.formattedValue || "0";
              } else {
                totalValue = 0;
                formattedValue = "0";
              }
            } else {
              // Calculate totals from current zoom level filtered data
              // Use the measure's aggregate function to properly handle weightedAverage and other complex aggregations
              const values = currentItems.map((item) => measure.getValue(item));
              totalValue = Number(measure.aggregate(values)) || 0;

              formattedValue = measure.formatValue
                ? measure.formatValue(totalValue)
                : String(totalValue);
            }
          }

          return (
            <div key={measure.id} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {measure.icon && (
                  <span className="text-sm">{measure.icon}</span>
                )}
                <span className="text-sm text-slate-600">{measure.name}</span>
              </div>
              <Badge variant="secondary" className="text-xs">
                {formattedValue}
              </Badge>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
